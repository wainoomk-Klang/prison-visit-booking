// Prison Visit Booking App Engine
// Supports both LocalStorage simulation (demo) and Google Apps Script Web App (production)

// Paste your Google Apps Script Web App URL here after deploying:
// Example: "https://script.google.com/macros/s/AKfycb.../exec"
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBUY2dwsZhMQiL2u7OoQdpwZ4KkHCY5P6jiZVJRRT4jMMxuFZ-cz4GlX2nvwvLtiO-BQ/exec";

// Check if Apps Script is configured
function isProduction() {
    return APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes("ใส่_WEB_APP_URL");
}

// Fallback Mock Data for demo mode
const INITIAL_SLOTS = {
    "zone1_am": 2,
    "zone1_pm": 15,
    "zone2_am": 10,
    "zone2_pm": 20,
    "zone3_am": 12,
    "zone3_pm": 9,
    "zone4_am": 28,
    "zone4_pm": 11,
    "zone5_am": 5,
    "zone6_am": 1,
    "zone7_pm": 8,
    "zone8_pm": 0
};

const STORAGE_BOOKINGS_KEY = "prison_bookings_data";
const STORAGE_SLOTS_KEY = "prison_slots_data";

if (!localStorage.getItem(STORAGE_BOOKINGS_KEY)) {
    localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify([
        {
            inmateId: "1100100200300",
            inmateTitle: "นาย",
            inmateName: "สมชาย",
            inmateSurname: "รักดี",
            zone: "1",
            grade: "ชั้นกลาง",
            slot: "zone1_pm",
            slotText: "แดน 1 วันจันทร์ที่ 24 สิงหาคม 2569 (รอบบ่าย)",
            visitors: [
                { type: "บิดา", title: "นาย", name: "สมโภช", surname: "รักดี", cid: "1100100111222", tel: "0812345678" }
            ],
            status: "approved",
            dateBooked: "2026-07-16T10:00:00.000Z",
            files: ["1100100200300_inmate_doc.jpg"],
            driveFolderUrl: "#"
        }
    ]));
}
if (!localStorage.getItem(STORAGE_SLOTS_KEY)) {
    localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(INITIAL_SLOTS));
}

// Fallback Mock Inmates Database (Matching user Excel spreadsheet format)
const MOCK_INMATES = [
    { inmateCode: "6911300978", name: "กิตติพันธ์", surname: "ทิพเสถียร", citizenId: "1468100000373", grade: "ชั้นต้องปรับปรุง", zone: "1", disciplinedDetails: "กระทำผิดวินัย: ทะเลาะวิวาท" },
    { inmateCode: "6911300977", name: "วุฒิเดช", surname: "ขำพุด", citizenId: "1460400061117", grade: "ชั้นต้องปรับปรุง", zone: "4", disciplinedDetails: "" },
    { inmateCode: "6911300975", name: "อภิวัฒน์", surname: "สมบัติหล้า", citizenId: "1407700009061", grade: "ชั้นดีมาก", zone: "6", disciplinedDetails: "" },
    { inmateCode: "6911300974", name: "สุชารัตน์", surname: "ศรีเมือง", citizenId: "1119902051313", grade: "ชั้นกลาง", zone: "1", disciplinedDetails: "" },
    { inmateCode: "6911300972", name: "อิทธิฤทธิ์", surname: "นาทันเลิศ", citizenId: "1460301248227", grade: "ชั้นต้องปรับปรุง", zone: "4", disciplinedDetails: "" }
];

async function searchInmateOnServer(searchKey) {
    if (isProduction()) {
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=search_inmate&key=${encodeURIComponent(searchKey)}`);
            const result = await response.json();
            return result;
        } catch (e) {
            console.error("Error searching inmate on Sheets:", e);
            return { status: "error", message: "เกิดข้อผิดพลาดในการดึงฐานข้อมูล: " + e.message };
        }
    } else {
        const cleanKey = searchKey.trim().replace(/\s+/g, "");
        const found = MOCK_INMATES.find(i => i.inmateCode === cleanKey || i.citizenId === cleanKey);
        if (found) {
            return {
                status: "success",
                found: true,
                data: found
            };
        } else {
            return {
                status: "success",
                found: false
            };
        }
    }
}

// Check status of a booking by Inmate Citizen ID (reads whole sheet in backend)
async function checkBookingOnServer(inmateCid) {
    if (isProduction()) {
        try {
            const timestamp = Date.now();
            const response = await fetch(`${APPS_SCRIPT_URL}?action=check_booking&key=${encodeURIComponent(inmateCid)}&_t=${timestamp}`);
            const result = await response.json();
            if (result.status === "success" && result.found) {
                return result;
            }

            // Fallback Stage 1: Fetch all bookings (same as admin) and search locally
            const allBookings = await getBookings();
            const rawKey = inmateCid.trim().toLowerCase();
            const cleanKey = rawKey.replace(/\s+/g, "");

            let found = allBookings.find(b => {
                const bId = String(b.inmateId || "").trim().replace(/\s+/g, "").toLowerCase();
                const bCode = String(b.inmateCode || "").trim().replace(/\s+/g, "").toLowerCase();
                const bName = String(b.inmateName || "").trim().replace(/\s+/g, "").toLowerCase();

                if (bId !== "" && bId !== "-" && bId === cleanKey) return true;
                if (bCode !== "" && bCode !== "-" && bCode === cleanKey) return true;
                if (cleanKey.length >= 2 && bName.indexOf(cleanKey) > -1) return true;
                if (rawKey.length >= 2 && bName.indexOf(rawKey) > -1) return true;
                return false;
            });

            if (found) {
                return { status: "success", found: true, data: found };
            }

            // Fallback Stage 2: Look up inmate database sheet first, then match name against allBookings
            const inmateCheck = await searchInmate(inmateCid);
            if (inmateCheck && inmateCheck.found && inmateCheck.data) {
                const iData = inmateCheck.data;
                const searchName = String(iData.name || "").trim().toLowerCase();
                const searchSurname = String(iData.surname || "").trim().toLowerCase();
                const searchCode = String(iData.inmateCode || "").trim().toLowerCase();
                const searchCid = String(iData.citizenId || "").trim().toLowerCase();

                found = allBookings.find(b => {
                    const bId = String(b.inmateId || "").trim().replace(/\s+/g, "").toLowerCase();
                    const bName = String(b.inmateName || "").trim().replace(/\s+/g, "").toLowerCase();

                    if (searchCid !== "" && searchCid !== "-" && bId === searchCid) return true;
                    if (searchCode !== "" && searchCode !== "-" && bId === searchCode) return true;
                    if (searchName !== "" && bName.indexOf(searchName) > -1) return true;
                    if (searchSurname !== "" && bName.indexOf(searchSurname) > -1) return true;
                    return false;
                });

                if (found) {
                    return { status: "success", found: true, data: found };
                }
            }

            return result;
        } catch (e) {
            console.error("Error checking booking on Sheets:", e);
            return { status: "error", message: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + e.message };
        }
    } else {
        const bookings = JSON.parse(localStorage.getItem(STORAGE_BOOKINGS_KEY)) || [];
        const cleanKey = inmateCid.trim().replace(/\s+/g, "");
        
        // Find if this is a 10-digit Inmate Code and map to citizenId in mock
        let targetId = cleanKey;
        const mockInmate = MOCK_INMATES.find(i => i.inmateCode === cleanKey);
        if (mockInmate) {
            targetId = mockInmate.citizenId;
        }
        
        const found = bookings.find(b => String(b.inmateId).trim() === String(targetId).trim() || String(b.inmateId).trim() === cleanKey);
        if (found) {
            return {
                status: "success",
                found: true,
                data: found
            };
        } else {
            return {
                status: "success",
                found: false
            };
        }
    }
}

// Fetch all bookings
async function getBookings() {
    if (isProduction()) {
        try {
            const timestamp = Date.now();
            const response = await fetch(`${APPS_SCRIPT_URL}?action=read&_t=${timestamp}`, { cache: "no-store" });
            const result = await response.json();
            if (result.status === "success" && Array.isArray(result.data)) {
                return result.data;
            }
        } catch (e) {
            console.error("Error fetching bookings from Sheet:", e);
        }
    }
    return JSON.parse(localStorage.getItem(STORAGE_BOOKINGS_KEY)) || [];
}

// Fetch current slot quotas
async function getSlots() {
    if (isProduction()) {
        try {
            const bookings = await getBookings();
            const slots = {};
            // Start from 0
            Object.keys(INITIAL_SLOTS).forEach(k => slots[k] = 0);
            // Count from active bookings (1 inmate/booking per slot)
            bookings.forEach(b => {
                if (b.status !== "rejected" && b.slot) {
                    slots[b.slot] = (slots[b.slot] || 0) + 1;
                }
            });
            
            return slots;
        } catch (e) {
            console.error("Error computing slots from production:", e);
        }
    }
    return JSON.parse(localStorage.getItem(STORAGE_SLOTS_KEY));
}

// Save dynamic changes (simulated for LocalStorage, or executed via API)
async function changeBookingStatusOnServer(inmateId, newStatus, remarks, updatedVisitors = null, inmateName = "") {
    if (isProduction()) {
        try {
            const body = {
                action: "update_status",
                inmateId: inmateId,
                inmateName: inmateName || "",
                status: newStatus,
                remarks: remarks || ""
            };

            if (updatedVisitors !== null) {
                if (Array.isArray(updatedVisitors)) {
                    body.visitorsJson = JSON.stringify(updatedVisitors);
                    body.visitorsText = updatedVisitors.map((v, i) => `${i+1}. ${v.title || ''}${v.name || ''} ${v.surname || ''} (${v.relation || ''}) โทร: ${v.tel || ''}`).join('\n');
                } else if (typeof updatedVisitors === 'string') {
                    body.visitorsText = updatedVisitors;
                    body.visitorsJson = updatedVisitors;
                }
            }

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            return result.status === "success";
        } catch (e) {
            console.error("Failed to update status on server:", e);
            return false;
        }
    } else {
        const bookings = JSON.parse(localStorage.getItem(STORAGE_BOOKINGS_KEY)) || [];
        const booking = bookings.find(b => b.inmateId === inmateId);
        if (booking) {
            booking.status = newStatus;
            booking.remarks = remarks || "";
            if (updatedVisitors !== null) {
                booking.visitors = updatedVisitors;
            }
            localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
        }
        return true;
    }
}

// Convert files to base64 with client-side image compression to speed up mobile uploads
function getBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const resultData = event.target.result;
            // If not an image (e.g. PDF file), resolve with raw base64 data directly
            if (!file.type || !file.type.startsWith('image/')) {
                resolve(resultData);
                return;
            }

            // If it is an image, compress via Canvas
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    const maxWidth = 1200;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                } catch (e) {
                    // Fallback to raw base64 if canvas processing fails
                    resolve(resultData);
                }
            };
            img.onerror = () => {
                // Fallback to raw base64 if image loading fails (e.g. disguised PDF/HEIC)
                resolve(resultData);
            };
            img.src = resultData;
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
    });
}

// Submit a new booking
async function uploadAndSaveBooking(bookingData, rawFiles) {
    if (isProduction()) {
        try {
            // Process base64 uploads
            const payload = {
                action: "create",
                inmateId: bookingData.inmateId,
                inmateFullName: bookingData.inmateFullName,
                zone: bookingData.zone,
                grade: bookingData.grade,
                slot: bookingData.slot,
                slotText: bookingData.slotText,
                visitors: []
            };

            // Inmate house registration
            if (rawFiles.inmateDoc) {
                payload.inmateDocBase64 = await getBase64(rawFiles.inmateDoc);
                payload.inmateDocName = `${bookingData.inmateId}_ทะเบียนบ้านผู้ต้องขัง.jpg`;
            }

            // Visitors files
            for (let i = 0; i < bookingData.visitors.length; i++) {
                const visitor = bookingData.visitors[i];
                const rawVisFiles = rawFiles.visitors[i];

                const visPayload = {
                    relation: visitor.relation,
                    title: visitor.title,
                    name: visitor.name,
                    surname: visitor.surname,
                    cid: visitor.cid,
                    tel: visitor.tel
                };

                if (rawVisFiles.idCard) {
                    visPayload.idCardBase64 = await getBase64(rawVisFiles.idCard);
                }
                if (rawVisFiles.relationDoc) {
                    visPayload.relationBase64 = await getBase64(rawVisFiles.relationDoc);
                }
                if (rawVisFiles.extraDoc) {
                    visPayload.extraBase64 = await getBase64(rawVisFiles.extraDoc);
                }
                if (rawVisFiles.extraDoc2) {
                    visPayload.extra2Base64 = await getBase64(rawVisFiles.extraDoc2);
                }
                if (rawVisFiles.nameChangeDoc) {
                    visPayload.nameChangeBase64 = await getBase64(rawVisFiles.nameChangeDoc);
                }
                if (rawVisFiles.surnameChangeDoc) {
                    visPayload.surnameChangeBase64 = await getBase64(rawVisFiles.surnameChangeDoc);
                }

                payload.visitors.push(visPayload);
            }

            // Post to Apps Script
            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight triggers
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            return result;
        } catch (e) {
            console.error("Failed to upload to Production server:", e);
            return { status: "error", message: "ระบบขัดข้องในการเชื่อมต่อระบบฐานข้อมูล Google: " + e.message };
        }
    } else {
        // Local storage demo mode
        const bookings = JSON.parse(localStorage.getItem(STORAGE_BOOKINGS_KEY)) || [];
        const slots = JSON.parse(localStorage.getItem(STORAGE_SLOTS_KEY)) || {};

        const existingIdx = bookings.findIndex(b => String(b.inmateId).trim() === String(bookingData.inmateId).trim());
        if (existingIdx >= 0 && bookings[existingIdx].status === "rejected") {
            const oldSlot = bookings[existingIdx].slot;
            
            bookings[existingIdx].inmateFullName = bookingData.inmateFullName;
            bookings[existingIdx].zone = bookingData.zone;
            bookings[existingIdx].grade = bookingData.grade;
            bookings[existingIdx].slot = bookingData.slot;
            bookings[existingIdx].slotText = bookingData.slotText;
            bookings[existingIdx].visitors = bookingData.visitors;
            bookings[existingIdx].status = "pending";
            bookings[existingIdx].dateBooked = new Date().toISOString();
            bookings[existingIdx].remarks = ""; // Clear rejection reasons
            
            if (oldSlot !== bookingData.slot) {
                if (slots[oldSlot] > 0) slots[oldSlot]--;
                slots[bookingData.slot] = (slots[bookingData.slot] || 0) + 1;
            }
        } else {
            const newBooking = {
                inmateId: bookingData.inmateId,
                inmateFullName: bookingData.inmateFullName,
                inmateName: bookingData.inmateFullName.split(" ")[0],
                inmateSurname: bookingData.inmateFullName.split(" ").slice(-1)[0],
                zone: bookingData.zone,
                grade: bookingData.grade,
                slot: bookingData.slot,
                slotText: bookingData.slotText,
                visitors: bookingData.visitors,
                status: "pending",
                dateBooked: new Date().toISOString(),
                files: [`${bookingData.inmateId}_inmate_doc.jpg`],
                driveFolderUrl: "#"
            };

            bookings.push(newBooking);
            slots[bookingData.slot] = (slots[bookingData.slot] || 0) + 1;
        }

        localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
        localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));

        return { status: "success", message: "ลงทะเบียนจองสิทธิ์ในระบบจำลองสำเร็จ" };
    }
}

// Global Dark Mode Control (Disabled to keep fixed Light theme)
function initTheme() {
    // Fixed clean light theme
}

// Format Date string
function formatThaiDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }) + " น.";
}
