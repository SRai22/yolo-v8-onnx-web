import React, {useState, useRef, useEffect} from 'react';
import Yolo from './components/detector'; 
import {Webcam} from "react-webcam";
import {Camera} from "@mediapipe/camera_utils";
import './App.css';
import { drawBoxes } from './components/DrawUtils';

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  let stats;
  let startInferenceTime, numInferences = 0;
  let inferenceTimeSum = 0, lastPanelUpdate = 0;

  const [detector, setDetector] = useState(null);

  const beginEstimateStats =() =>{
    startInferenceTime = (performance || Date).now();
  }

  const endEstimateStats =() =>{
    const endInferenceTime = (performance || Date).now();
    inferenceTimeSum += endInferenceTime - startInferenceTime;
    ++numInferences;

    const panelUpdateMilliseconds = 1000;
    if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
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
        alert(error);
      }

      endEstimateStats();
    }

    const canvasElement = canvasRef.current;
    if(detections && detections.length > 0){
      drawBoxes(canvasElement, detections);
    }
  }

  useEffect(()=>{
    const loadDetector = async () =>{
      const detector = new Yolo(`${process.env.PUBLIC_URL}/model/`);
      await detector.loadModel();
      setDetector(detector);
    }
    loadDetector();
  }, []);


  const RunDetection = async () =>{
    const camera = new Camera(webcamRef.current.video, {
      onFrame: async () =>{
        await renderResult(webcamRef.current.video);
      },
      facingMode: "user",
      width: 640,
      height: 640
    });
    camera.start();
  }

  return (
    <div>
      <Webcam ref = {webcamRef} />
      <canvas
        ref={canvasRef}
        className="output_canvas"
        style={{
            position: "fixed",
            left: 640,
            top: 100,
            width: 640,
            height: 640,
        }}
      ></canvas>
    </div>
  );
}

export default App;
