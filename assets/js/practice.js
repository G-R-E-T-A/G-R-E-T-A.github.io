const URL = "https://raw.githubusercontent.com/Jyothis-P/G.R.E.T.A/master/models/model.json";

let checkBox, video, model, webcam, labelContainer, letter, winCount, lossCount, winSound, defeatSound;
let countElement;

let score = 0;
let startTime = 0;
let counting = false;

const CATEGORIES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'nothing'];

function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function () {
        this.sound.play();
    }
    this.stop = function () {
        this.sound.pause();
    }
}


function changeLetter() {
    letter = CATEGORIES[Math.floor(Math.random() * (CATEGORIES.length - 1))];
    document.getElementById('head1').innerHTML = letter;
}

function incrementScore() {
    winSound.play();
    score++;
    document.getElementById("head3").innerHTML = score;
}

function startCountdown() {
    startTime = new Date().getTime();
    counting = true;
    countElement.style.color = "black";
    changeButtonText('Stop');
    countdown();
}

function onCountdownEnd() {
    checkBox.checked = false;
    defeatSound.play();
    countElement.innerHTML = '00:00';
    countElement.style.color = "black";
    counting = false;
    changeButtonText('Try again!');

    setTimeout(() => {
        alert("Awesome! You got a score of " + score);
    }, 1000);
   
}

function countdown() {
    var now = new Date().getTime();
    var target = startTime + (60 * 1000); //60s countdown
    var distance = target - now;
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    var millis = Math.floor((distance % (1000)) / 10);

    if (distance < (10 * 1000)) {
        countElement.style.color = "red";
    }

    if (distance < 0) {
        return onCountdownEnd();
    }

    let timeLeft = seconds + ':' + millis;

    countElement.innerHTML = timeLeft;

    if (counting) {
        setTimeout(countdown, 10);
    }

}

window.onload = () => {
    checkBox = document.getElementById("stream");
    countElement = document.getElementById("countdown");

    winSound = new sound('assets/sounds/correct.wav');
    defeatSound = new sound('assets/sounds/game over.wav');
    console.log("Sounds loaded.");
    initModel();
}

async function initModel(){
    model = await tf.loadLayersModel(URL);
    console.log("Model loaded.");
    initButton();
}

function changeButtonText(text){
    let button = document.getElementById("webcamButton");
    var txt = button.innerText.trim();
    var html = button.innerHTML;
    button.innerHTML = html.replace(txt, text);
}

function initButton(){
    let button = document.getElementById("webcamButton");
    button.classList.remove('disabled');
    button.disabled = false;
}

function init() {
    let buttonClicked = Date.now();

    if (checkBox.checked == true) {
        checkBox.checked = false;
        onCountdownEnd();
        return;
    }

    startCountdown();

    letter = document.getElementById('head1').innerHTML;
    winCount = 0;
    lossCount = 0;

    document.getElementById("head3").innerHTML = score;

    let bulb = document.getElementById("bulb");
    bulb.style.opacity = .2;

    checkBox.checked = true;

    labelContainer = document.getElementById('label-container');
    video = document.getElementById("videoInput"); // video is the id of video tag
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

        if (winCount > 6) {
            winCount = 0;
            bulb.style.opacity = 1;
            incrementScore();
            changeLetter();
        }



        // schedule next one.
        let delay = 1000 / FPS - (Date.now() - begin);

        if (checkBox.checked == true) {
            setTimeout(processVideo, delay);
        } else {
            stop(video);
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
