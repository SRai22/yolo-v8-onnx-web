import {Tensor, InferenceSession} from "onnxruntime-web";
var cv = require("@techstark/opencv-js");

class Yolo{
    constructor(modelPath){
        this.modelPath = modelPath;
        this.session = null;
        this.modelWidth = 640;
        this.modelHeight = 640;
        this.modelName = "yolov8n.onnx";
        this.nmsModel = "nms-yolov8.onnx";
        this.modelInputShape =  [1, 3, 640, 640];
        this.iouThreshold = 0.45;
        this.scoreThreshold = 0.2;
        this.topk = 100;
    }

    async loadModel() {
        const yolov8 = await InferenceSession.create(`${this.modelPath}/${this.modelName}`);
        const nms = await InferenceSession.create(`${this.modelPath}/${this.nmsModel}`);

        const tensor = new Tensor(
            "float32",
            new Float32Array(modelInputShape.reduce((a, b) => a * b)),
            modelInputShape
          );
        await yolov8.run({ images: tensor });
        console.log("inference session created successfully");
        this.session = {net: yolov8, nms: nms};
    }

    async predict(video){
        const [input, xRatio, yRatio] = this.preprocessing(video, this.modelWidth, this.modelHeight);
        const tensor = new Tensor("float32", input.data32F, this.modelInputShape);
        const config = new Tensor("float32", new Float32Array([this.topk, this.iouThreshold, this.scoreThreshold]));
        const {output0} = await this.session.net.run({images: Tensor});
        const {selected} = await this.session.nms.run({detection: output0, config: config});

        const predictions = [];

        for(let i = 0; i<selected.dims[1]; i++){
            const data = selected.data.slice(i*selected.dims[2], (i+1)*selected.dims[2]); //get rows
            const bbox = data.slice(0,4);
            const scores = data.slice(4);
            const score = Math.max(...scores);
            const label = scores.indexOf(score);

            const [x, y, w, h] = [
                    (bbox[0] - 0.5 * bbox[2]) * xRatio, // upscale left
                    (bbox[1] - 0.5 * bbox[3]) * yRatio, // upscale top
                    bbox[2] * xRatio, // upscale width
                    bbox[3] * yRatio, // upscale height
                    ];

            predictions.push({
                label: label,
                probability: score, 
                bbox: [x, y, w, h]
            });
        }
        input.delete();
        return predictions;
    }

    preprocessing(video, modelWidth, modelHeight){
        const cap = new cv.VideoCapture(video);
        video.height = video.videoHeight;
        video.width = video.videoWidth;
        const mat = new cv.Mat(video.videoHeight,video.videoWidth,cv.CV_8UC4);
        cap.read(mat);
        const matC3 = new cv.Mat(mat.rows, mat.cols, cv.CV_8UC3); // new image matrix
        cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR
      
        // padding image to [n x n] dim
        const maxSize = Math.max(matC3.rows, matC3.cols); // get max size from width and height
        const xPad = maxSize - matC3.cols, // set xPadding
          xRatio = maxSize / matC3.cols; // set xRatio
        const yPad = maxSize - matC3.rows, // set yPadding
          yRatio = maxSize / matC3.rows; // set yRatio
        const matPad = new cv.Mat(); // new mat for padded image
        cv.copyMakeBorder(matC3, matPad, 0, yPad, 0, xPad, cv.BORDER_CONSTANT); // padding black
      
        const input = cv.blobFromImage(
          matPad,
          1 / 255.0, // normalize
          new cv.Size(modelWidth, modelHeight), // resize to model input size
          new cv.Scalar(0, 0, 0),
          true, // swapRB
          false // crop
        ); // preprocessing image matrix
      
        // release mat opencv
        mat.delete();
        matC3.delete();
        matPad.delete();
      
        return [input, xRatio, yRatio];
      };
}

export default Yolo;