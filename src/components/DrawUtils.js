import labels from "./labels.json"


export const drawBoxes = (ctx, detections) => {
    const colors = new Colors();

    detections.forEach(boundingBox =>{
        const label = labels[boundingBox.label];
        const color = colors.get(boundingBox.label);
        const score = (boundingBox.probability * 100).toFixed(1);
        const [x,y,width,height] = boundingBox.bbox;
        const font = `18px Arial`;
        ctx.font = font;
        ctx.textBaseline = "top";

        ctx.fillStyle = Colors.hexToRgba(color, 0.2);
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(Math.min(ctx.canvas.width, ctx.canvas.height)/200, 2.5);
        ctx.strokeRect(x, y, width, height);

        //display the label
        ctx.fillStyle = color;
        const textWidth = ctx.measureText(label + "-" + score + "%").width;
        const textHeight = parseInt(font, 10);
        const yText = y -  (textHeight + ctx.lineWidth);
        ctx.fillRect(
            x-1,
            yText < 0? 0: yText,
            textWidth + ctx.lineWidth,
            textHeight + ctx.lineWidt
        );

        ctx.fillStyle = "#ffffff";
        ctx.fillText(label + "-"+score + "%", x-1, yText<0? 1: yText+1);
    });

};

/**
 * Color array
 */
const COLOR_PALETTE = [
  '#ffffff', '#800000', '#469990', '#e6194b', '#42d4f4', '#fabed4', '#aaffc3',
  '#9a6324', '#000075', '#f58231', '#4363d8', '#ffd8b1', '#dcbeff', '#808000',
  '#ffe119', '#911eb4', '#bfef45', '#f032e6', '#3cb44b', '#a9a9a9'
];

export const drawDetections = (detections, ctx) =>{
  // Loop through each bounding box
  let i=0;
  detections.forEach(prediction => {
    // Extract boxes and classes
    const [x, y, width, height] = prediction.bbox; 
    const text = labels[prediction.label]; 
    // Set styling
    const color = COLOR_PALETTE[i]
    ctx.strokeStyle = color
    ctx.font = '18px Arial';

    // Draw rectangles and text
    ctx.beginPath();   
    ctx.fillStyle = color
    ctx.fillText(text, x, y);
    ctx.rect(x, y, width, height); 
    ctx.stroke();
    i++;
  });
}
class Colors {
    // ultralytics color palette https://ultralytics.com/
    constructor() {
      this.palette = [
        "#FF3838",
        "#FF9D97",
        "#FF701F",
        "#FFB21D",
        "#CFD231",
        "#48F90A",
        "#92CC17",
        "#3DDB86",
        "#1A9334",
        "#00D4BB",
        "#2C99A8",
        "#00C2FF",
        "#344593",
        "#6473FF",
        "#0018EC",
        "#8438FF",
        "#520085",
        "#CB38FF",
        "#FF95C8",
        "#FF37C7",
      ];
      this.n = this.palette.length;
    }
  
    get = (i) => this.palette[Math.floor(i) % this.n];
  
    static hexToRgba = (hex, alpha) => {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `rgba(${[parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)].join(
            ", "
          )}, ${alpha})`
        : null;
    };
}