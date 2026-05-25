// dùng để chứa các chức năng của socket

let socketInstance = null;

// inject socket vào service
export function setMasterSocket(ws) {
    socketInstance = ws;
}

// gửi packet lên master
export function sendToMaster(msg) {

    if (
        socketInstance &&
        socketInstance.readyState === 1
    ) {
        socketInstance.send(JSON.stringify(msg));
    }
    else {
        console.error("[Master] Socket chưa sẵn sàng!");
    }
}