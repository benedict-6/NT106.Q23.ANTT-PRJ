#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

#define TASK_COMM_LEN 16

enum event_type {
    EV_TCP_CONNECT,
    EV_TCP_ACCEPT,
    EV_TCP_STATE,
    EV_UDP_SEND,
    EV_UDP_RECV,
    EV_PROC_FORK,
    EV_PROC_EXEC,
    EV_PROC_EXIT
};

// Define event structure that eunomia-bpf will print as JSON
struct event {
    unsigned long long timestamp;
    u32 pid;
    u32 ppid; // for fork
    u32 type; // event_type
    
    // network
    u32 saddr;
    u32 daddr;
    u16 sport;
    u16 dport;
    u8 family;
    u8 protocol; // 6 for TCP, 17 for UDP
    int state;
    
    // process
    int exit_code;
    char comm[TASK_COMM_LEN];
    char filename[256];
};

// Force emit the struct into BTF so eunomia can parse it
const struct event *unused __attribute__((unused));

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} rb SEC(".maps");

static __always_inline void fill_net_info(struct event *e, struct sock *sk) {
    e->family = BPF_CORE_READ(sk, __sk_common.skc_family);
    e->saddr = BPF_CORE_READ(sk, __sk_common.skc_rcv_saddr);
    e->daddr = BPF_CORE_READ(sk, __sk_common.skc_daddr);
    
    u16 dport = BPF_CORE_READ(sk, __sk_common.skc_dport);
    e->dport = __builtin_bswap16(dport);
    e->sport = BPF_CORE_READ(sk, __sk_common.skc_num);
}

// ---------------- TCP HOOKS ----------------

SEC("fentry/inet_sock_set_state")
int BPF_PROG(tcp_set_state, struct sock *sk, int oldstate, int newstate)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0; // IPv4 only for simplicity

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    
    e->type = EV_TCP_STATE;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 6;
    e->state = newstate;
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("fentry/tcp_connect")
int BPF_PROG(tcp_connect, struct sock *sk)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->type = EV_TCP_CONNECT;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 6;
    e->state = 2; // TCP_SYN_SENT
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("fexit/inet_csk_accept")
int BPF_PROG(tcp_accept, struct sock *sk, int flags, int *err, bool kern, struct sock *ret_sk)
{
    if (!ret_sk) return 0;

    if (BPF_CORE_READ(ret_sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->type = EV_TCP_ACCEPT;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 6;
    e->state = 1; // TCP_ESTABLISHED
    fill_net_info(e, ret_sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

// ---------------- UDP HOOKS ----------------
// Note: UDP doesn't have connect in the same way, we hook sendmsg and recvmsg

SEC("fentry/udp_sendmsg")
int BPF_PROG(udp_send, struct sock *sk, struct msghdr *msg, size_t len)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->type = EV_UDP_SEND;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 17;
    // state ACTIVE = custom logic in userspace
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("fentry/udp_recvmsg")
int BPF_PROG(udp_recv, struct sock *sk, struct msghdr *msg, size_t len, int noblock, int flags, int *addr_len)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->type = EV_UDP_RECV;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 17;
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

// ---------------- PROCESS HOOKS ----------------

// We'll use tracepoint instead of fentry for process, tracepoints are generally more stable, 
// but since you asked for fentry/_do_fork, it's actually kernel_clone in newer kernels (> 5.10).
// I will use kprobe/kernel_clone (or sys_clone) as fallback, but I'll use kprobe for do_execveat_common for wide compat.

SEC("kprobe/kernel_clone")
int BPF_KPROBE(kprobe_kernel_clone)
{
    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    u64 id = bpf_get_current_pid_tgid();
    e->type = EV_PROC_FORK;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = id >> 32; // In clone context it's tricky, but this is the parent's PID
    e->ppid = e->pid; 
    
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("kprobe/do_execveat_common")
int BPF_KPROBE(kprobe_do_execveat_common, int fd, struct filename *filename)
{
    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->type = EV_PROC_EXEC;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    
    const char *name;
    bpf_core_read(&name, sizeof(name), &filename->name);
    bpf_probe_read_kernel_str(&e->filename, sizeof(e->filename), name);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("kprobe/do_exit")
int BPF_KPROBE(kprobe_do_exit, long code)
{
    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;

    e->type = EV_PROC_EXIT;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->exit_code = code;
    
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

char _license[] SEC("license") = "GPL";
