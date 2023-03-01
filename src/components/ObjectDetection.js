import React, {useState, useRef, useEffect} from 'react';
import Yolo from './detector'; 
import Webcam from "react-webcam";
import { Camera } from "@mediapipe/camera_utils";
import { drawDetections } from './DrawUtils';
import { setupStats } from './StatsPanel';

function ObjectDetection() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    let detector;
    let startInferenceTime = 0, numInferences = 0;
    let inferenceTimeSum = 0, lastPanelUpdate = 0;
    let stats;

    const beginEstimateStats =() =>{
        startInferenceTime = (performance || Date).now();
    }

    const endEstimateStats =() =>{
        const endInferenceTime = (performance || Date).now();
        inferenceTimeSum += endInferenceTime - startInferenceTime;
        ++numInferences;

        const panelUpdateMilliseconds = 1000;
        if ((endInferenceTime - lastPanelUpdate) >= panelUpdateMilliseconds) {
            const averageInferenceTime = inferenceTimeSum / numInferences;
            inferenceTimeSum = 0;
            numInferences = 0;
            stats.customFpsPanel.update(
                1000.0 / averageInferenceTime, 120 /* maxValue */);
            lastPanelUpdate = endInferenceTime;
        }
    }

    const renderResult = async (video) =>{
        let detections; 
        if(detector !== null){
          beginEstimateStats();
          try{
            detections = await detector.predict(video);
          } catch(error){
            detector = null;
            alert(error);
          }
    
          endEstimateStats();
        }
        console.log(detections);
        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d')
        canvasElement.width = 640;
        canvasElement.height = 640;
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        if(detections && detections.length > 0){
          //drawBoxes(canvasCtx, detections);
          drawDetections(detections, canvasCtx);
        }
        canvasCtx.restore();
    }

    useEffect(()=>{
        const loadDetector = async () =>{
          detector = new Yolo(`${process.env.PUBLIC_URL}/model`);
          await detector.loadModel();
        }
        loadDetector();
      }, []);

      const runDetection = () =>{
        stats = new setupStats();
        const camera = new Camera(webcamRef.current.video,{
            onFrame: async () =>{
                await renderResult(webcamRef.current.video);
            },
            facingMode:'environment',
            width: 640,
            height: 640
        });
        camera.start();
    }

    return(
      <>
      <Webcam ref = {webcamRef} />
      <canvas
        ref={canvasRef}
        className="output_canvas"
        style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 640,
            height: 640,
        }}
      >
      </canvas>
      <button onClick={runDetection}>turn on model</button>
      </>
  )
}

export default ObjectDetection;