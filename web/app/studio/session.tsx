"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Comparison, FileProgress, Loaded } from "../../studio/types";
import { QUESTIONS } from "../../studio/fixture";

function useSessionState() {
  const worker = useRef<Worker | null>(null),
    sequence = useRef(0);
  // Studio has one active operation. Cancellation rejects that operation.
  const pending = useRef<{
    resolve: (value: any) => void;
    reject: (reason: Error) => void;
  } | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [comparison, setComparison] = useState<Comparison | null>(null);
  const [url, setUrl] = useState("https://github.com/preactjs/preact"),
    [question, setQuestion] = useState("Where are hooks defined?");
  const [live, setLive] = useState(true),
    [inferenceAvailable, setInferenceAvailable] = useState(false);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const [inspected, setInspected] = useState(""),
    [secondary, setSecondary] = useState(false),
    [mobileMethod, setMobileMethod] = useState("embeddings");
  const [controls, setControls] = useState(true);
  const [fileProgress, setFileProgress] = useState<FileProgress | null>(null);
  function connect() {
    const w = new Worker("/studio-worker.js");
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (data.type === "progress") {
        setProgress(data.files ? "" : data.text);
        if (data.files) setFileProgress(data.files);
        return;
      }
      const request = pending.current;
      pending.current = null;
      if (data.type === "error") request?.reject(new Error(data.message));
      else request?.resolve(data.value);
    };
    w.onerror = () => {
      pending.current?.reject(
        new Error(
          "The browser worker stopped. Cancel and retry in a browser with WebAssembly GC.",
        ),
      );
      pending.current = null;
    };
  }
  function send(
    operation: string,
    fields: Record<string, unknown> = {},
  ): Promise<any> {
    if (pending.current) return Promise.reject(new Error("Studio is busy."));
    if (!worker.current) connect();
    const id = ++sequence.current;
    return new Promise((resolve, reject) => {
      pending.current = { resolve, reject };
      worker.current!.postMessage({ id, operation, ...fields });
    });
  }
  useEffect(() => {
    void fetch("/api/inference")
      .then((r) => r.json())
      .then((c) => setInferenceAvailable(c.embedding || c.jev))
      .catch(() => {});
    connect();
    return () => worker.current?.terminate();
  }, []);
  async function index(fixture = false) {
    setBusy(true);
    setError("");
    setComparison(null);
    setProgress("Loading Flix and requesting public extraction…");
    setFileProgress({ phase: "Source", completed: 0, total: 0 });
    try {
      const result = await send("index", { url, fixture });
      setLoaded(result);
      setInspected("");
      if (fixture) setQuestion(QUESTIONS[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
      setFileProgress(null);
    }
  }
  async function ask() {
    setBusy(true);
    setError("");
    setProgress("Comparing answers…");
    try {
      setComparison(
        await send("query", {
          question,
          live: live && inferenceAvailable,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    pending.current?.reject(new Error("Cancelled."));
    pending.current = null;
    setBusy(false);
    setProgress("");
    setFileProgress(null);
    setLoaded(null);
    setComparison(null);
  }
  async function clear() {
    await send("clear");
    setLoaded(null);
    setComparison(null);
    setInspected("");
  }
  return {
    loaded,
    comparison,
    url,
    setUrl,
    question,
    setQuestion,
    live,
    setLive,
    inferenceAvailable,
    busy,
    progress,
    error,
    inspected,
    setInspected,
    secondary,
    setSecondary,
    mobileMethod,
    setMobileMethod,
    controls,
    setControls,
    fileProgress,
    index,
    ask,
    cancel,
    clear,
  };
}
const Context = createContext<ReturnType<typeof useSessionState> | null>(null);
export function StudioSession({ children }: { children: ReactNode }) {
  const value = useSessionState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStudio() {
  const value = useContext(Context);
  if (!value) throw new Error("Studio session is missing.");
  return value;
}
