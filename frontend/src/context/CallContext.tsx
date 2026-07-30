import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { getSocket } from '../api/socket';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ToastContext';

type CallType = 'audio' | 'video';
type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected';

interface CallState {
  status: CallStatus;
  callType: CallType | null;
  peerId: string | null;
  peerNickname: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  startCall: (peerId: string, peerNickname: string, type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallState>({
  status: 'idle',
  callType: null,
  peerId: null,
  peerNickname: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  startCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
});

export const useCall = () => useContext(CallContext);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerNickname, setPeerNickname] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setStatus('idle');
    setCallType(null);
    setPeerId(null);
    setPeerNickname(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const createPeerConnection = useCallback((remoteUserId: string) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit('ice_candidate', { to: remoteUserId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    return pc;
  }, [cleanup]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.id);

    const handleIncomingCall = async (data: { from: string; callType: CallType }) => {
      setPeerId(data.from);
      setCallType(data.callType);
      setStatus('incoming');
    };

    const handleCallAccepted = async (data: { from: string }) => {
      if (status !== 'outgoing') return;
      const stream = localStreamRef.current;
      if (!stream) return;
      const pc = createPeerConnection(data.from);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket().emit('offer', { to: data.from, offer: pc.localDescription });
      setStatus('connected');
    };

    const handleCallRejected = () => {
      cleanup();
    };

    const handleOffer = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      const pc = createPeerConnection(data.from);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      getSocket().emit('answer', { to: data.from, answer: pc.localDescription });
      setStatus('connected');
    };

    const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    };

    const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {}
      }
    };

    const handleCallEnded = () => {
      cleanup();
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
    };
  }, [user, status, createPeerConnection, cleanup]);

  const startCall = useCallback(async (peerUserId: string, nickname: string, type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPeerId(peerUserId);
      setPeerNickname(nickname);
      setCallType(type);
      setStatus('outgoing');
      getSocket(user?.id).emit('call_user', { to: peerUserId, callType: type });
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Разрешите доступ к микрофону и камере в настройках браузера'
        : e?.name === 'NotFoundError'
        ? 'Не найден микрофон или камера'
        : 'Не удалось начать звонок';
      addToast(msg);
      cleanup();
    }
  }, [cleanup, addToast]);

  const acceptCall = useCallback(async () => {
    if (!peerId || !callType) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      getSocket(user?.id).emit('call_accepted', { to: peerId });
    } catch (e: any) {
      const msg = e?.name === 'NotAllowedError'
        ? 'Разрешите доступ к микрофону и камере в настройках браузера'
        : e?.name === 'NotFoundError'
        ? 'Не найден микрофон или камера'
        : 'Не удалось начать звонок';
      addToast(msg);
      cleanup();
    }
  }, [peerId, callType, cleanup, addToast]);

  const rejectCall = useCallback(() => {
    if (peerId) {
      getSocket().emit('call_rejected', { to: peerId });
    }
    cleanup();
  }, [peerId, cleanup]);

  const endCall = useCallback(() => {
    if (peerId) {
      getSocket().emit('call_ended', { to: peerId });
    }
    cleanup();
  }, [peerId, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsCameraOff(!stream.getVideoTracks()[0]?.enabled);
    }
  }, []);

  return (
    <CallContext.Provider
      value={{
        status, callType, peerId, peerNickname,
        localStream, remoteStream, isMuted, isCameraOff,
        startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};
