import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import gsap from "gsap";
import { Button, Icon, IconButton } from "../components/ui";
import { toast } from "../components/Toaster";
import { prefersReducedMotion } from "../lib/motion";

const ID_IN_TEXT = /[a-f0-9]{24}/i;

function extractAccountId(text) {
  return text.match(ID_IN_TEXT)?.[0]?.toLowerCase() ?? null;
}

/** Kit: "Scanner". Uses the browser's BarcodeDetector where available (Chrome on Android, Edge, Safari 17+). */
export default function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const lineRef = useRef(null);
  const fileRef = useRef(null);
  const trackRef = useRef(null);
  const [problem, setProblem] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const supported = "BarcodeDetector" in window;

  const found = (raw) => {
    const id = extractAccountId(raw);
    if (!id) {
      toast("That QR code isn't a Ledger Pay account.");
      return false;
    }
    navigator.vibrate?.(40);
    navigate(`/pay?to=${id}`, { replace: true });
    return true;
  };

  useEffect(() => {
    if (!supported) {
      setProblem("This browser can't scan QR codes. Paste the account ID instead.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setProblem("The camera needs a secure (https) connection. Paste the account ID instead.");
      return;
    }

    let stream;
    let timer;
    let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    const scan = async () => {
      if (stopped) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length && found(codes[0].rawValue)) return;
      } catch {
        // frame not ready yet
      }
      timer = setTimeout(scan, 250);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const track = s.getVideoTracks()[0];
        trackRef.current = track;
        setTorchSupported(Boolean(track.getCapabilities?.().torch));
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
        scan();
      })
      .catch(() => setProblem("Camera access was blocked. Allow it in your browser settings, or paste the ID."));

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  useEffect(() => {
    if (problem || prefersReducedMotion()) return;
    const tween = gsap.fromTo(lineRef.current, { y: 0 }, { y: 236, duration: 1.8, ease: "sine.inOut", repeat: -1, yoyo: true });
    return () => tween.kill();
  }, [problem]);

  const toggleTorch = async () => {
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((t) => !t);
    } catch {
      toast("Couldn't switch the flashlight.");
    }
  };

  const fromGallery = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supported) return;
    try {
      const bitmap = await createImageBitmap(file);
      const codes = await new window.BarcodeDetector({ formats: ["qr_code"] }).detect(bitmap);
      if (!codes.length) toast("No QR code found in that image.");
      else found(codes[0].rawValue);
    } catch {
      toast("Couldn't read that image.");
    }
  };

  return (
    <div className="fixed inset-0 z-40 mx-auto max-w-[440px] overflow-hidden bg-black text-white">
      <video ref={videoRef} playsInline muted className="absolute inset-0 size-full object-cover" />

      {/* Dimmed surround with a clear square window, like the kit's scanner. */}
      <div className="absolute inset-0 flex flex-col items-center pt-28">
        <div className="relative size-[268px] rounded-[28px] shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]">
          {[
            "left-0 top-0 border-l-4 border-t-4 rounded-tl-[28px]",
            "right-0 top-0 border-r-4 border-t-4 rounded-tr-[28px]",
            "left-0 bottom-0 border-b-4 border-l-4 rounded-bl-[28px]",
            "right-0 bottom-0 border-b-4 border-r-4 rounded-br-[28px]",
          ].map((pos) => (
            <span key={pos} className={`absolute size-12 border-white ${pos}`} />
          ))}
          {!problem ? <span ref={lineRef} className="absolute inset-x-6 top-4 h-0.5 rounded-full bg-[#8ab4f8] shadow-[0_0_12px_#8ab4f8]" /> : null}
        </div>
        <p className="mt-6 max-w-[280px] text-center text-sm text-white/85">
          {problem ?? "Point your camera at a Ledger Pay QR code"}
        </p>
        {supported ? (
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="mt-5 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur"
          >
            <Icon name="image" size={20} />
            Upload from gallery
          </button>
        ) : null}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={fromGallery} />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2 pt-3">
        <IconButton icon="close" label="Close" onClick={() => navigate(-1)} className="text-white hover:bg-white/10" />
        <div className="flex">
          {torchSupported ? (
            <IconButton
              icon="flashlight_on"
              fill={torchOn}
              label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
              onClick={toggleTorch}
              className="text-white hover:bg-white/10"
            />
          ) : null}
          <IconButton icon="qr_code" label="Your QR code" onClick={() => navigate("/qr")} className="text-white hover:bg-white/10" />
        </div>
      </div>

      <div className="pb-safe absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#1e1f20] px-6 pb-6 pt-5">
        <Button variant="tonal" className="h-12 w-full" onClick={() => navigate("/pay", { replace: true })}>
          <Icon name="content_paste" size={20} />
          Enter or paste an account ID
        </Button>
      </div>
    </div>
  );
}
