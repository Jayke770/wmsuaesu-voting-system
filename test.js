const { createCanvas, loadImage } = require('canvas')
const canvas = createCanvas(250, 250)
const ctx = canvas.getContext('2d')

// Draw background
ctx.fillStyle = '#f2f2f2';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Draw text
ctx.font = 'bold 60px Assistant';
ctx.fillStyle = "#1d1d1d";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText('JV', canvas.width / 2, canvas.height / 2);
console.log(canvas.toDataURL("image/png"))