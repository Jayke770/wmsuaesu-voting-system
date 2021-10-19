function avatar(text, foregroundColor, backgroundColor, textsize) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = 250;
    canvas.height = 250;

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.font = !textsize ? 'bold 60px Assistant' : textsize;
    context.fillStyle = foregroundColor;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
}