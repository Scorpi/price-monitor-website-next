import { type ZBarSymbol } from "@undecaf/zbar-wasm"
import type { NextPage } from "next"
import { useRouter } from "next/router"
import React, { useEffect, useRef, useState } from "react"

const useFps = () => {
  const [ms, setMs] = useState(0)
  const len = 10
  const [msArray] = useState(Array.from({ length: len }, () => 0))
  const reportMs = (ms: number) => {
    msArray.shift()
    msArray.push(ms)
    const sum = msArray.reduce((a, v) => a + v, 0)
    setMs(sum / len)
  }
  return {
    ms,
    reportMs,
  }
}

const initWorker = (video: HTMLVideoElement) => {
  const worker = new Worker(new URL("../scanner.worker.ts", import.meta.url))
  worker.postMessage({ type: "init", d: [video.videoWidth, video.videoHeight] })
  return worker
}

const setCanvasSize = (canvas: HTMLCanvasElement, video: HTMLVideoElement) => {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
}

type OnResultFn = (result: string) => unknown

const handleScanResult = (result: ZBarSymbol[], onResult: OnResultFn) => {
  const z = result.find((v) => v.typeName === "ZBAR_EAN13")
  if (z) {
    return onResult(Array.from(z.data).map((v) => String.fromCharCode(v)).join(""))
  }
}

const Scanner: React.FC<{ onResult: OnResultFn }> = ({ onResult }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worker = useRef<Worker | null>(null)
  const interval = useRef<NodeJS.Timer | undefined>(undefined)
  const pendingScans = useRef(0)
  const dateStart = useRef(0)

  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState("Loading...")

  const { ms, reportMs } = useFps()

  const runInterval = () => {
    const grab = () => {
      if (pendingScans.current < 1) {
        dateStart.current = Date.now()
        if (!canvasRef.current || !videoRef.current) return
        const canvas = canvasRef.current
        const video = videoRef.current
        if (video.videoWidth === 0 || video.videoHeight === 0) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        // console.log(worker)
        worker.current?.postMessage({ type: "scan", data })
        pendingScans.current++
      }
    }

    pendingScans.current = 0
    grab()
    interval.current = setInterval(grab, 200)
  }

  useEffect(() => {
    void (async () => {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setStatus("Your device does not support camera")
      }

      setStatus("Setting up camera...")

      let cameraRes: MediaStream
      try {
        cameraRes = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: 1920,
          },
        })
      } catch (error) {
        console.error(error)
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            return setStatus("Camera access denied")
          }
        }
        setStatus("Failed to access camera")
        return
      }

      const video = videoRef.current
      if (!video) return

      setStatus("Setting up video...")

      video.srcObject = cameraRes
      video.play()
        .then(() => {
          const canvas = canvasRef.current
          if (canvas) {
            setCanvasSize(canvas, video)
          }
          worker.current = initWorker(video)
          worker.current?.addEventListener("message", (event) => {
            if (event.data.type === "scan") {
              pendingScans.current--
              handleScanResult(event.data.result, onResult)
              reportMs(Date.now() - dateStart.current)
            }
            // console.log("from worker", event.data)
          })

          setStatus("Running...")

          runInterval()
          setIsReady(true)
        })
        .catch((error) => {
          console.warn("unable to play video", error)
        })
    })()

    // reader.decodeFromConstraints(
    //   { video: { facingMode: "environment" } },
    //   videoRef.current,
    //   (result, error) => {
    //     if (!result) {
    //       return
    //     }
    //     return onResult(result)
    //   },
    // )
    //
    // return () => reader.reset()
    return () => {
      console.log("Clearing up...")
      clearInterval(interval.current)
      worker.current?.terminate()
    }
  }, [])

  // useEffect(() => {
  //   void (async () => {
  //     // const device = await navigator?.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } })
  //     // setDeviceId(device.id)
  //     // const devices = await reader.listVideoInputDevices()
  //     // console.log(devices)
  //     // setDevices(devices)
  //     // if (devices.length > 0) {
  //     //   setDeviceId(devices.find((v) => v.)?.deviceId || devices[0].deviceId)
  //     // }
  //   })()
  // }, [])

  return (
    <div>
      {/*<select onChange={(e) => setDeviceId(e.target.value)} value={deviceId || undefined}>*/}
      {/*  {devices.map((device) => <option value={device.deviceId} key={device.deviceId}>{device.label}</option>)}*/}
      {/*</select>*/}
      {!isReady && (
        <div className="fixed inset-0 bg-white flex flex-col justify-center text-center">
          {status}
        </div>
      )}
      <div className="relative" style={{ display: isReady ? undefined : "none" }}>
        <video playsInline ref={videoRef} />
        <span className="absolute right-0 top-0 bg-white font-semibold text-xs px-1 py-0.5">{ms.toFixed(1)} ms</span>
      </div>
      <canvas style={{ display: "none" }} ref={canvasRef} />
    </div>
  )
}

const Home: NextPage = () => {
  const router = useRouter()
  const onResult = async (result: string) => {
    console.log("onResult!")
    await router.push(`/product/ean/${result}`)
  }
  useEffect(() => {
    router.beforePopState((state) => {
      console.log("state", state)
      return true
    })
  }, [])
  return (
    <main>
      <Scanner onResult={onResult} />
    </main>
  )
}

export default Home
