// Prison Visit Booking App Engine
// Supports both LocalStorage simulation (demo) and Google Apps Script Web App (production)

// Paste your Google Apps Script Web App URL here after deploying:
// Example: "https://script.google.com/macros/s/AKfycb.../exec"
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwnxE0A6TDgMfjeejG98aierCl8qME25y6E9IJ4UjKierp-VXhJ1QgBtYU9vEnwJyDQRg/exec";

// Check if Apps Script is configured
function isProduction() {
    return APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes("ใส่_WEB_APP_URL");
}

// Fallback Mock Data for demo mode
const INITIAL_SLOTS = {
    "zone1_am": 2,
    "zone1_pm": 15,
    "zone2_am": 300, // Full
    "zone2_pm": 20,
    "zone3_am": 12,
    "zone3_pm": 9,
    "zone4_am": 28,
    "zone4_pm": 11,
    "zone5_am": 5,
    "zone6_am": 1,
    "zone7_pm": 300, // Full
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
    { inmateCode: "6911300978", name: "กิตติพันธ์", surname: "ทิพเสถียร", citizenId: "1468100000373", grade: "ชั้นต้องปรับปรุง" },
    { inmateCode: "6911300977", name: "วุฒิเดช", surname: "ขำพุด", citizenId: "1460400061117", grade: "ชั้นต้องปรับปรุง" },
    { inmateCode: "6911300975", name: "อภิวัฒน์", surname: "สมบัติหล้า", citizenId: "1407700009061", grade: "ชั้นดีมาก" },
    { inmateCode: "6911300974", name: "สุชารัตน์", surname: "ศรีเมือง", citizenId: "1119902051313", grade: "ชั้นกลาง" },
    { inmateCode: "6911300972", name: "อิทธิฤทธิ์", surname: "นาทันเลิศ", citizenId: "1460301248227", grade: "ชั้นต้องปรับปรุง" }
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

// Fetch all bookings
async function getBookings() {
    if (isProduction()) {
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=read`);
            const result = await response.json();
            if (result.status === "success") {
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
            // Count from active bookings
            bookings.forEach(b => {
                if (b.status !== "rejected" && b.slot) {
                    slots[b.slot] = (slots[b.slot] || 0) + b.visitors.length;
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
async function changeBookingStatusOnServer(inmateId, newStatus) {
    if (isProduction()) {
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors", // Allows sending cross-origin request to Google redirection
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_status",
                    inmateId: inmateId,
                    status: newStatus
                })
            });
            // Due to 'no-cors' redirection, we update local cache or wait for reload
            return true;
        } catch (e) {
            console.error("Failed to update status on server:", e);
            return false;
        }
    } else {
        const bookings = JSON.parse(localStorage.getItem(STORAGE_BOOKINGS_KEY));
        const booking = bookings.find(b => b.inmateId === inmateId);
        if (booking) {
            booking.status = newStatus;
            localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
        }
        return true;
    }
}

// Convert files to base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
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
        localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));

        slots[bookingData.slot] = (slots[bookingData.slot] || 0) + bookingData.visitors.length;
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
