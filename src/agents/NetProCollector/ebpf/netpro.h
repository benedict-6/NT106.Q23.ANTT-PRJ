#ifndef __NETPRO_H
#define __NETPRO_H

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

struct event {
    unsigned long long timestamp;
    unsigned int pid;
    unsigned int ppid; // for fork
    unsigned int type; // event_type
    
    // network
    unsigned int saddr;
    unsigned int daddr;
    unsigned short sport;
    unsigned short dport;
    unsigned char family;
    unsigned char protocol; // 6 for TCP, 17 for UDP
    unsigned short _pad1; // Explicit padding
    int state;
    
    // process
    int exit_code;
    char comm[TASK_COMM_LEN];
    char filename[256];
};

#endif /* __NETPRO_H */
