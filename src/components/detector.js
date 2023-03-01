import {Tensor, InferenceSession} from "onnxruntime-web";
//var cv = require("@techstark/opencv-js");
import cv from "@techstark/opencv-js";

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
        cv["onRuntimeInitialized"] = async () => {
        const [yolov8, nms] = await Promise.all([
            InferenceSession.create(`${this.modelPath}/${this.modelName}`),
            InferenceSession.create(`${this.modelPath}/${this.nmsModel}`),
        ]);

        const tensor = new Tensor(
            "float32",
            new Float32Array(this.modelInputShape.reduce((a, b) => a * b)),
            this.modelInputShape
          );
        await yolov8.run({ images: tensor });
        console.log("inference session created successfully");
        this.session = {net: yolov8, nms: nms};
        };
    }

    async predict(video){
        const [input, xRatio, yRatio] = this.preprocessing(video, this.modelWidth, this.modelHeight);
        const tensor = new Tensor("float32", input.data32F, this.modelInputShape);
        const config = new Tensor("float32", new Float32Array([this.topk, this.iouThreshold, this.scoreThreshold]));
        const {output0} = await this.session.net.run({images: tensor});
        const { selected } = await this.session.nms.run({ detection: output0, config: config }); // perform nms and filter boxes
        const boxes = [];

        // looping through output
        for (let idx = 0; idx < selected.dims[1]; idx++) {
            const data = selected.data.slice(idx * selected.dims[2], (idx + 1) * selected.dims[2]); // get rows
            const box = data.slice(0, 4);
            const scores = data.slice(4); // classes probability scores
            const score = Math.max(...scores); // maximum probability scores
            const label = scores.indexOf(score); // class id of maximum probability scores

            const [x, y, w, h] = [
            (box[0] - 0.5 * box[2]) * xRatio, // upscale left
            (box[1] - 0.5 * box[3]) * yRatio, // upscale top
            box[2] * xRatio, // upscale width
            box[3] * yRatio, // upscale height
            ]; // keep boxes in maxSize range

            boxes.push({
            label: label,
            probability: score,
            bbox: [x, y, w, h], // upscale box
            }); // update boxes to draw later
        }
        input.delete();
        return boxes;
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

    CalculateIoU(obj0, obj1) {
        const interx0 = Math.max(obj0.x, obj1.x);
        const intery0 = Math.max(obj0.y, obj1.y);
        const interx1 = Math.min(obj0.x + obj0.w, obj1.x + obj1.w);
        const intery1 = Math.min(obj0.y + obj0.h, obj1.y + obj1.h);
        if (interx1 < interx0 || intery1 < intery0) return 0;
    
        const area0 = obj0.w * obj0.h;
        const area1 = obj1.w * obj1.h;
        const areaInter = (interx1 - interx0) * (intery1 - intery0);
        const areaSum = area0 + area1 - areaInter;
    
        return areaInter / areaSum;
    }
    
    Nms(bbox_list, threshold_nms_iou, check_class_id) {
        const bbox_nms_list = []
        bbox_list.sort((lhs, rhs) => {
            if (lhs.score > rhs.score) return -1;
            return bbox_nms_list;
        });
    
        const is_merged = new Array(bbox_list.length).fill(false);
        for (let index_high_score = 0; index_high_score < bbox_list.length; index_high_score++) {
            const candidates = [];
            if (is_merged[index_high_score]) continue;
            candidates.push(bbox_list[index_high_score]);
            for (let index_low_score = index_high_score + 1; index_low_score < bbox_list.length; index_low_score++) {
                if (is_merged[index_low_score]) continue;
                if (check_class_id && bbox_list[index_high_score].class_id !== bbox_list[index_low_score].class_id) continue;
                if (this.CalculateIoU(bbox_list[index_high_score], bbox_list[index_low_score]) > threshold_nms_iou) {
                    candidates.push(bbox_list[index_low_score]);
                    is_merged[index_low_score] = true;
                }
            }
    
            bbox_nms_list.push(candidates[0]);
        }

        return bbox_nms_list;
    }
    
}

export default Yolo;