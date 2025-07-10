// Switch between sections
document.getElementById('register-btn').addEventListener('click', () => {
    document.getElementById('registration-section').classList.remove('hidden');
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('history-section').classList.add('hidden');
});

document.getElementById('scanner-btn').addEventListener('click', () => {
    document.getElementById('registration-section').classList.add('hidden');
    document.getElementById('scanner-section').classList.remove('hidden');
    document.getElementById('history-section').classList.add('hidden');
});

document.getElementById('history-btn').addEventListener('click', () => {
    document.getElementById('registration-section').classList.add('hidden');
    document.getElementById('scanner-section').classList.add('hidden');
    document.getElementById('history-section').classList.remove('hidden');
    updateHistoryTable();
});

// Student Registration with QR Code Generation
document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const studentId = document.getElementById('student-id').value;
    const studentName = document.getElementById('student-name').value;
    const studentEmail = document.getElementById('student-email').value;
    const studentCourse = document.getElementById('student-course').value;
    
    try {
        const response = await fetch('http://localhost:3001/api/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: studentId,
                name: studentName,
                email: studentEmail,
                course: studentCourse
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
        }
        
        const data = await response.json();
        
        // Generate and display QR code
        generateQRCode(data.qrData);
        
        // Display student info
        document.getElementById('qr-student-name').textContent = studentName;
        document.getElementById('qr-student-id').textContent = studentId;
        
        // Show QR section
        document.getElementById('qr-code-result').classList.remove('hidden');
        
        alert('Student registered successfully!');
        e.target.reset();
    } catch (error) {
        console.error('Registration error:', error);
        alert(`Error: ${error.message}`);
    }
});

// Generate QR Code function
function generateQRCode(data) {
    // Clear previous QR code
    document.getElementById('qrcode').innerHTML = '';
    
    try {
        // Generate new QR code using QRCode.js
        new QRCode(document.getElementById('qrcode'), {
            text: data,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (error) {
        console.error('QR generation error:', error);
        document.getElementById('qrcode').innerHTML = 'Error generating QR code';
    }
}

// Print QR Code
document.getElementById('print-qr-btn').addEventListener('click', function() {
    const printWindow = window.open('', '_blank');
    const studentDetails = document.getElementById('student-details').innerHTML;
    const qrCode = document.getElementById('qrcode').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Student QR Code</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; }
                .container { margin: 20px auto; max-width: 400px; }
                .student-info { margin: 20px 0; }
                #qrcode canvas { margin: 0 auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Student Attendance QR Code</h2>
                <div class="student-info">${studentDetails}</div>
                <div>${qrCode}</div>
                <p>Scan this code to mark attendance</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
});

// QR Scanner functionality
let scannerActive = false;
let stream = null;

document.getElementById('start-scanner').addEventListener('click', () => {
    scannerActive = true;
    document.getElementById('qr-result').style.display = 'none';
    document.getElementById('qr-video').style.display = 'block';
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(s) {
            stream = s;
            document.getElementById('qr-video').srcObject = stream;
            document.getElementById('qr-video').setAttribute("playsinline", true);
            document.getElementById('qr-video').play();
            requestAnimationFrame(tick);
        })
        .catch(function(err) {
            console.error("Camera access error:", err);
            alert("Could not access camera. Please ensure camera permissions are granted.");
        });
});

document.getElementById('stop-scanner').addEventListener('click', () => {
    scannerActive = false;
    document.getElementById('qr-video').style.display = 'none';
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

function tick() {
    if (!scannerActive) return;
    
    const video = document.getElementById('qr-video');
    const canvas = document.getElementById('qr-canvas');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            handleQRScan(code.data);
        }
    }
    
    requestAnimationFrame(tick);
}

async function handleQRScan(data) {
    if (!scannerActive) return;
    
    // Stop scanner after successful scan
    scannerActive = false;
    document.getElementById('qr-video').style.display = 'none';
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    // Check if this is a student QR code
    if (data.startsWith('STUDENT:')) {
        const parts = data.split(':');
        const studentId = parts[1];
        const studentName = parts[2];
        
        try {
            const response = await fetch('http://localhost:3001/api/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId,
                    studentName
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Attendance recording failed');
            }
            
            const result = await response.json();
            
            // Display result
            const qrResult = document.getElementById('qr-result');
            qrResult.style.display = 'block';
            qrResult.innerHTML = `
                <strong>Attendance Recorded:</strong><br>
                Student: ${studentName}<br>
                ID: ${studentId}<br>
                Time: ${result.time}<br>
                Date: ${result.date}
            `;
            
            // Update history table if visible
            if (!document.getElementById('history-section').classList.contains('hidden')) {
                updateHistoryTable();
            }
        } catch (error) {
            console.error('Attendance error:', error);
            const qrResult = document.getElementById('qr-result');
            qrResult.style.display = 'block';
            qrResult.innerHTML = `Error: ${error.message}`;
        }
    } else {
        const qrResult = document.getElementById('qr-result');
        qrResult.style.display = 'block';
        qrResult.innerHTML = 'Invalid QR code!';
    }
}

// Attendance History - UPDATED TO FIX UNDEFINED VALUES
async function updateHistoryTable(filterId = '') {
    try {
        const url = filterId 
            ? `http://localhost:3001/api/attendance?studentId=${encodeURIComponent(filterId)}`
            : 'http://localhost:3001/api/attendance';
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }
        
        const records = await response.json();
        const historyData = document.getElementById('history-data');
        historyData.innerHTML = '';
        
        if (!records || records.length === 0) {
            historyData.innerHTML = '<tr><td colspan="5" style="text-align: center;">No attendance records found</td></tr>';
            return;
        }
        
        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.student_id || 'N/A'}</td>
                <td>${record.student_name || 'N/A'}</td>
                <td>${record.date || 'N/A'}</td>
                <td>${record.time || 'N/A'}</td>
                <td>${record.status || 'N/A'}</td>
            `;
            historyData.appendChild(row);
        });
    } catch (error) {
        console.error('History fetch error:', error);
        document.getElementById('history-data').innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: red;">
                    Error loading records: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Search functionality
document.getElementById('search-btn').addEventListener('click', () => {
    const searchValue = document.getElementById('search-student').value.trim();
    updateHistoryTable(searchValue);
});

// Initialize the page
document.getElementById('registration-section').classList.remove('hidden');
document.getElementById('scanner-section').classList.add('hidden');
document.getElementById('history-section').classList.add('hidden');