import React, { useEffect, useState, useRef } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useAuth } from "../contexts/auth/authProvider";
import Navigation from "./Navigation";
import { toast } from "react-hot-toast";
import { Copy, Video, UserPlus, Users } from "lucide-react";
import EducationalFooter from "../EducationalFooter/EducationalFooter";

interface JitsiConfig {
  resolution: number;
  constraints: {
    video: {
      aspectRatio: number;
      height: { ideal: number; max: number; min: number };
      width: { ideal: number; max: number; min: number };
      frameRate: { max: number };
    };
  };
  startWithAudioMuted: boolean;
  startWithVideoMuted: boolean;
  enableLayerSuspension: boolean;
  startBitrate: string;
  disableAudioLevels: boolean;
  disableSimulcast: boolean;
  enableRemb: boolean;
  enableTcc: boolean;
  disableModeratorIndicator: boolean;
  defaultLanguage: string;
  enableLobby: boolean;
  fileRecordingsEnabled: boolean;
  liveStreamingEnabled: boolean;
  requireDisplayName: boolean;
  enableWelcomePage: boolean;
  enableClosePage: boolean;
}

const OnlineClassroom = () => {
  const { account } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(true);

  const [isHost, setIsHost] = useState(false);
  const [, setParticipants] = useState<any[]>([]);

  const [showParticipantsList, setShowParticipantsList] = useState(false);

  const jitsiApi = useRef<any>(null);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "participant",
  });

  const defaultConfig: JitsiConfig = {
    resolution: 720,
    constraints: {
      video: {
        aspectRatio: 16 / 9,
        height: { ideal: 720, max: 720, min: 180 },
        width: { ideal: 1280, max: 1280, min: 320 },
        frameRate: { max: 30 },
      },
    },
    startWithAudioMuted: true,
    startWithVideoMuted: false,
    enableLayerSuspension: true,
    startBitrate: "800",
    disableAudioLevels: true,
    disableSimulcast: false,
    enableRemb: true,
    enableTcc: true,
    disableModeratorIndicator: false,
    defaultLanguage: "vi",
    enableLobby: true,
    fileRecordingsEnabled: true,
    liveStreamingEnabled: true,
    requireDisplayName: true,
    enableWelcomePage: false,
    enableClosePage: true,
  };

  const [jitsiConfig] = useState<JitsiConfig>(defaultConfig);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await account.get();
        setUserData({
          name: user.name || "",
          email: user.email || "",
          role: user.labels?.includes("Admin") ? "host" : "participant",
        });
      } catch (error) {
        console.error("Error getting user data:", error);
      }
    };
    getUserData();
  }, [account]);

  const generateRandomRoomName = () => {
    return "vgm_" + Math.random().toString(36).substring(2, 12);
  };

  const createRoom = () => {
    const newRoomName = generateRandomRoomName();
    setRoomName(newRoomName);
    setShowJoinForm(false);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast.error("Vui lòng nhập mã phòng");
      return;
    }
    setShowJoinForm(false);
  };

  const handleClose = () => {
    setShowJoinForm(true);
    setRoomName("");
    if (jitsiApi.current) {
      jitsiApi.current.executeCommand("hangup");
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomName);
    toast.success("Đã sao chép mã phòng");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        {showJoinForm ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-gray-900">
                  Phòng học trực tuyến
                </h1>
                <p className="text-gray-500">
                  Tạo phòng mới hoặc tham gia phòng học có sẵn
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <button
                  onClick={createRoom}
                  className="group p-6 border-2 border-blue-100 rounded-2xl hover:border-blue-200 transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                      <Video className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Tạo phòng mới
                      </h3>
                      <p className="text-sm text-gray-500">
                        Bắt đầu một phòng học mới
                      </p>
                    </div>
                  </div>
                </button>

                <div className="relative flex items-center gap-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="text-sm text-gray-500 bg-white px-3">
                    hoặc
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <form onSubmit={joinRoom} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mã phòng học
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 text-lg bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                        placeholder="Nhập mã phòng học..."
                      />
                      <UserPlus className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium"
                  >
                    Tham gia ngay
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Trở về
                  </button>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Mã phòng:</span>
                    <span className="font-medium text-gray-900">
                      {roomName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {isHost && (
                    <button
                      onClick={() =>
                        setShowParticipantsList(!showParticipantsList)
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={copyRoomCode}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Sao chép mã
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden shadow-xl relative">
              <JitsiMeeting
                domain="meet.vgm.cloud"
                roomName={roomName}
                configOverwrite={jitsiConfig}
                interfaceConfigOverwrite={{
                  TOOLBAR_BUTTONS: [
                    "microphone",
                    "camera",
                    "closedcaptions",
                    "desktop",
                    "fullscreen",
                    "fodeviceselection",
                    "hangup",
                    "profile",
                    "chat",
                    "recording",
                    "livestreaming",
                    "etherpad",
                    "sharedvideo",
                    "settings",
                    "raisehand",
                    "videoquality",
                    "filmstrip",
                    "invite",
                    "feedback",
                    "stats",
                    "shortcuts",
                    "tileview",
                    "videobackgroundblur",
                    "download",
                    "help",
                    "mute-everyone",
                    "security",
                  ],
                  DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                  MOBILE_APP_PROMO: false,
                  DEFAULT_BACKGROUND: "#2a3042",
                  THEME_COLOR: "#2a3042",
                  BACKGROUND_COLOR: "#2a3042",
                }}
                userInfo={{
                  displayName: userData.name,
                  email: userData.email,
                }}
                onApiReady={(api) => {
                  jitsiApi.current = api;
                  api.on("participantJoined", (participant) => {
                    setParticipants((prev) => [...prev, participant]);
                  });
                  api.on("participantLeft", (participant) => {
                    setParticipants((prev) =>
                      prev.filter((p) => p.id !== participant.id)
                    );
                  });
                  api.on("videoConferenceJoined", () => {
                    if (userData.role === "host") {
                      setIsHost(true);
                    }
                  });
                }}
                getIFrameRef={(iframeRef) => {
                  iframeRef.style.height = "700px";
                }}
                onReadyToClose={handleClose}
              />
            </div>
          </div>
        )}
      </div>
      <EducationalFooter />
    </div>
  );
};

export default OnlineClassroom;
