let APP_ID = "eb1e02c4d9404f26b95bdf627ee81dd7"


let token = null
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let localStream
let remoteStream

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let init = async() => {
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid,token})

    //index.html?room=2302032
    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined',handleUserJoined)
    channel.on('MemberLeft',handleUserLeft)

    client.on('MessageFromPeer',handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
    document.getElementById('user-1').srcObject = localStream
    
}

let handleUserJoined = async (MemberID) => {
    console.log('A new user joined the channel: ',MemberID)
    createOffer(MemberID)
}

let handleUserLeft = async (MemberID) => {
    document.getElementById('user-2').style.display = 'none'
}

let handleMessageFromPeer = async (message,MemberID) => {
    message = JSON.parse(message.text)
    if (message.type === 'offer') {
        createAnswer(MemberID, message.offer)
    }
    if (message.type === 'answer') {
        addAnswer(message.answer)
    }
    if (message.type === 'candidate') {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let createPeerConnection = async (MemberID) => {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:false})
        document.getElementById('user-1').srcObject = localStream
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) =>{
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async(event) => {
        if (event.candidate) {
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})},MemberID)
        }
    }
}

let createOffer = async (MemberID) => {
    await createPeerConnection(MemberID)

    let offer = await peerConnection.createOffer()  
    await peerConnection.setLocalDescription(offer)
    client.sendMessageToPeer({text:JSON.stringify({'type':'offer','offer':offer})},MemberID)
}

let createAnswer = async (MemberID, offer)=>{
    await createPeerConnection(MemberID)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer','answer':answer})},MemberID)
}

let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async () => {
    await channel.leave();
    await client.logout();
} 

window.addEventListener('beforeunload',leaveChannel)

init()      