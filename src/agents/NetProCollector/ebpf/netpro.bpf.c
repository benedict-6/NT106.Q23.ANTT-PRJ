#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>

#define AF_INET 2
#include "netpro.h"

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

SEC("kprobe/tcp_set_state")
int BPF_KPROBE(tcp_set_state, struct sock *sk, int newstate)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0; // IPv4 only for simplicity

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));
    
    e->type = EV_TCP_STATE;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 6;
    e->state = newstate;
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("kprobe/tcp_connect")
int BPF_KPROBE(tcp_connect, struct sock *sk)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

    e->type = EV_TCP_CONNECT;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 6;
    e->state = 2; // TCP_SYN_SENT
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("kretprobe/inet_csk_accept")
int BPF_KRETPROBE(tcp_accept, struct sock *ret_sk)
{
    if (!ret_sk) return 0;

    if (BPF_CORE_READ(ret_sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

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

SEC("kprobe/udp_sendmsg")
int BPF_KPROBE(udp_send, struct sock *sk, struct msghdr *msg, size_t len)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

    e->type = EV_UDP_SEND;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 17;
    // state ACTIVE = custom logic in userspace
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("kprobe/udp_recvmsg")
int BPF_KPROBE(udp_recv, struct sock *sk, struct msghdr *msg, size_t len, int noblock, int flags, int *addr_len)
{
    if (BPF_CORE_READ(sk, __sk_common.skc_family) != AF_INET)
        return 0;

    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

    e->type = EV_UDP_RECV;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    e->protocol = 17;
    fill_net_info(e, sk);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}


// ---------------- PROCESS HOOKS ----------------

// Using tracepoints for process lifecycle events as requested
// Tracepoints provide stable and reliable event hooking.

SEC("tracepoint/sched/sched_process_fork")
int tracepoint_sched_process_fork(struct trace_event_raw_sched_process_fork *ctx)
{
    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

    e->type = EV_PROC_FORK;
    e->timestamp = bpf_ktime_get_ns();
    e->ppid = ctx->parent_pid;
    e->pid = ctx->child_pid;
    
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("tracepoint/syscalls/sys_enter_execve")
int tracepoint_sys_enter_execve(struct trace_event_raw_sys_enter *ctx)
{
    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

    e->type = EV_PROC_EXEC;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    
    // In sys_enter_execve, ctx->args[0] holds the pointer to the filename in userspace
    const char *fname = (const char *)ctx->args[0];
    bpf_probe_read_user_str(&e->filename, sizeof(e->filename), fname);
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

SEC("tracepoint/sched/sched_process_exit")
int tracepoint_sched_process_exit(struct trace_event_raw_sched_process_template *ctx)
{
    struct event *e = bpf_ringbuf_reserve(&rb, sizeof(*e), 0);
    if (!e) return 0;
    __builtin_memset(e, 0, sizeof(*e));

    e->type = EV_PROC_EXIT;
    e->timestamp = bpf_ktime_get_ns();
    e->pid = bpf_get_current_pid_tgid() >> 32;
    
    // Get exit_code directly from task_struct safely
    struct task_struct *task = (struct task_struct *)bpf_get_current_task();
    e->exit_code = BPF_CORE_READ(task, exit_code);
    
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    
    bpf_ringbuf_submit(e, 0);
    return 0;
}

char _license[] SEC("license") = "GPL";
