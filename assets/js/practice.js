const URL = "https://raw.githubusercontent.com/Jyothis-P/G.R.E.T.A/master/models/model.json";

let model, webcam, labelContainer, letter, winCount, lossCount;

const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'nothing'];


function changeLetter() {
    let input = document.getElementById("letter-input").value.toUpperCase();
    let index = CATEGORIES.indexOf(input);
    console.log(index, input);
    if (index < 25 && index > -1) {
        document.getElementById('head1').innerHTML = input;
    } else {
        alert('Invalid Character. (We do not support "J" and "Z" currently)')
    }
    return;
}

// Load the image model and setup the webcam
async function init() {
    // const modelURL = URL + "model.json";
    let buttonClicked = Date.now();
    const model = await tf.loadLayersModel(URL);

    console.log("Model load success.");
    let checkBox = document.getElementById("stream");

    if (checkBox.checked == true) {
        checkBox.checked = false;
        return;
    }


    letter = document.getElementById('head1').innerHTML;
    winCount = 0;
    lossCount = 0;

    let bulb = document.getElementById("bulb");
    bulb.style.opacity = .2;

    checkBox.checked = true;

    labelContainer = document.getElementById('label-container');
    let video = document.getElementById("videoInput"); // video is the id of video tag
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function (stream) {
            video.srcObject = stream;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occurred! " + err);
        });

    let cap = new cv.VideoCapture(video);

    const FPS = 30;
    let src = new cv.Mat(480, 640, cv.CV_8UC4);


    function processVideo() {

        let begin = Date.now();

        cap.read(src);

        let height = src.rows;
        let width = src.cols;
        let x1 = (width - height) / 2;
        let x2 = (width + height) / 2;
        let rect = new cv.Rect(x1, 0, x2, height);
        let square = new cv.Mat();
        square = src.roi(rect);

        let dsize = new cv.Size(308, 308);
        cv.resize(square, square, dsize, 0, 0, cv.INTER_AREA);

        cv.flip(square, square, +1);

        cv.imshow("webcam-canvas", square);

        let dst = processImage(square);

        cv.imshow("canvasOutput", dst);
        // src.delete();
        square.delete();
        dst.delete();

        let image = tf.browser.fromPixels(document.getElementById("canvasOutput"), 1);
        image = image.reshape([1, 128, 128, 1])


        let prediction = model.predict(image);
        prediction = prediction.toBool();

        let index = prediction.flatten().argMax().dataSync();

        let alphabet = CATEGORIES[index];
        // labelContainer.innerHTML = alphabet;
        // console.log("End Output.");
        console.log(alphabet)

        let initialized = ((Date.now() - buttonClicked) / 1000) > 3;
        if (alphabet === letter && initialized) {
            winCount++;
        } else {
            winCount = (winCount >= 0) ? winCount - 1 : 0;
        }

        // console.log(winCount)

        if (winCount > 10) {
            winCount = 0;
            bulb.style.opacity = 1;
            // alert('Oh yeah!');
            stop(video);
            checkBox.checked = false;
            return;
        }



        // schedule next one.
        let delay = 1000 / FPS - (Date.now() - begin);

        if (checkBox.checked == true) {
            setTimeout(processVideo, delay);
        } else {
            stop(video)
        }
    }

    // schedule first one.
    setTimeout(processVideo, 0);
}

function stop(video) {
    var stream = video.srcObject;
    var tracks = stream.getTracks();

    for (var i = 0; i < tracks.length; i++) {
        var track = tracks[i];
        track.stop();
    }

    video.srcObject = null;
}

function processImage(src) {
    // console.log("Creating dst.");
    let dst = new cv.Mat();
    let dsize = new cv.Size(128, 128);
    // console.log("Resize");
    cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA);
    let conv1 = new cv.Mat();
    let conv2 = new cv.Mat();
    // console.log("Convert colorspace.");
    cv.cvtColor(dst, conv1, cv.COLOR_RGB2HSV, 0);
    cv.cvtColor(dst, conv2, cv.COLOR_RGBA2GRAY, 0);

    let lower = [0, 40, 30, 0];
    let higher = [43, 255, 254, 255];
    // let lower = [0, 0, 0, 0];
    // let higher = [150, 150, 150, 255];

    // console.log("Mask.");
    let mask = new cv.Mat(128, 128, cv.CV_8UC3);
    let low = new cv.Mat(128, 128, cv.CV_8UC3, lower);
    // console.log(conv1.data)
    let high = new cv.Mat(128, 128, cv.CV_8UC3, higher);
    cv.inRange(conv1, low, high, mask);

    cv.addWeighted(mask, 0.5, mask, 0.5, 0.0, mask);
    cv.medianBlur(mask, mask, 5);

    let skin = new cv.Mat();
    cv.bitwise_and(conv2, conv2, skin, mask)

    // console.log("Canny.");
    let edges = new cv.Mat();
    cv.Canny(skin, edges, 60, 60, 3, false);
    dst.delete();
    low.delete();
    high.delete();
    conv1.delete();
    conv2.delete();
    mask.delete();
    skin.delete();

    // console.log("Retruning.");
    return edges;
}
