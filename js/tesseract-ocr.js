$(document).ready(function () {
    var inputs = document.querySelectorAll('.inputfile');
    Array.prototype.forEach.call(inputs, function (input) {
        var label = input.nextElementSibling,
            labelVal = label.innerHTML;

        input.addEventListener('change', function (e) {
            var fileName = '';
            if (this.files && this.files.length > 1)
                fileName = (this.getAttribute('data-multiple-caption') || '').replace('{count}', this.files.length);
            else
                fileName = e.target.value.split('\\').pop();

            if (fileName) {
                label.querySelector('span').innerHTML = fileName;

                let reader = new FileReader();
                reader.onload = function () {
                    let dataURL = reader.result;
                    $("#selected-image").attr("src", dataURL);
                    $("#selected-image").addClass("col-12");
                }
                let file = this.files[0];
                reader.readAsDataURL(file);
                startRecognize(file);
            } else {
                label.innerHTML = labelVal;
                $("#selected-image").attr("src", '');
                $("#selected-image").removeClass("col-12");
                $("#log").empty();
                hideSpinner(); // Hide spinner if no file selected
            }
        });

        // Firefox bug fix
        input.addEventListener('focus', function () { input.classList.add('has-focus'); });
        input.addEventListener('blur', function () { input.classList.remove('has-focus'); });
    });
});

let startTime;
let processingComplete = false;
let extractedText = ""; // Variable to store the extracted text
let minProgress = 0; // Progress for the minimum display time

function startRecognize(file) {
    showSpinner();
    recognizeFile(file);
}

function showSpinner() {
    $("#overlay").removeClass("hidden");
    $("#spinner").show();

    startTime = Date.now();
    processingComplete = false;
    minProgress = 0;

    // Start the progress bar at 0% and gradually increase it to 100% over 22 seconds
    let interval = setInterval(function () {
        let elapsedTime = Date.now() - startTime;
        minProgress = Math.min((elapsedTime / 22000) * 100, 100);
        $("#progress-percentage").text(Math.round(minProgress) + "%");

        // If the time reaches 22 seconds, stop the interval
        if (elapsedTime >= 22000) {
            clearInterval(interval);
            // Check if processing is complete and update the progress
            if (processingComplete) {
                hideSpinner();
                showExtractedText();
            }
        }
    }, 100); // Update every 100ms
}

function hideSpinner() {
    $("#overlay").addClass("hidden");
    $("#spinner").hide();
}

function progressUpdate(packet) {
    if (packet.status === 'recognizing text') {
        let actualProgress = Math.round(packet.progress * 100);

        // Smoothly transition from minProgress to actualProgress after 22 seconds
        if (minProgress >= 100) {
            $("#progress-percentage").text(actualProgress + "%"); // Update with actual progress
        }
    } else if (packet.status === 'done') {
        processingComplete = true;
        extractedText = packet.data.text; // Save the extracted text
        let elapsedTime = Date.now() - startTime;

        if (elapsedTime >= 22000) {
            hideSpinner();
            showExtractedText();
        }
    }
}

function showExtractedText() {
    if (extractedText) { // Ensure there is extracted text to show
        $("#log").show();
        var pre = document.createElement('pre');
        pre.appendChild(document.createTextNode(extractedText.replace(/\n\s*\n/g, '\n')));
        $("#log").append(pre);
    } else {
        console.error("No extracted text to show.");
    }
}

function recognizeFile(file) {
    $("#log").empty(); // Optionally clear log
    const corePath = window.navigator.userAgent.indexOf("Edge") > -1
        ? 'js/tesseract-core.asm.js'
        : 'js/tesseract-core.wasm.js';

    const worker = new Tesseract.TesseractWorker({
        corePath,
    });

    worker.recognize(file, $("#langsel").val())
        .progress(function (packet) {
            console.info(packet);
            progressUpdate(packet);
        })
        .then(function (data) {
            console.log(data);
            progressUpdate({ status: 'done', data: data });
        });
}
