// Prison Visit Booking App Engine
// Utilizes LocalStorage for Demo persistence (mimicking a database)

// Mock Initial Slots Status (300 Max)
const INITIAL_SLOTS = {
    "zone1_am": 298, // Close to full to test warning/disabled states
    "zone1_pm": 150,
    "zone2_am": 300, // Fully booked slot
    "zone2_pm": 200,
    "zone3_am": 120,
    "zone3_pm": 90,
    "zone4_am": 280,
    "zone4_pm": 110,
    "zone5_am": 50,
    "zone6_am": 10,
    "zone7_pm": 300, // Fully booked slot
    "zone8_pm": 5
};

// Mock Inmate Booking Registry (LocalStorage Key)
const STORAGE_BOOKINGS_KEY = "prison_bookings_data";
const STORAGE_SLOTS_KEY = "prison_slots_data";

// Initialize LocalStorage with Mock Data if empty
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
            files: ["id_card_father.jpg", "house_reg_inmate.jpg"]
        }
    ]));
}

if (!localStorage.getItem(STORAGE_SLOTS_KEY)) {
    localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(INITIAL_SLOTS));
}

// Get Data from LocalStorage
function getBookings() {
    return JSON.parse(localStorage.getItem(STORAGE_BOOKINGS_KEY));
}

function getSlots() {
    return JSON.parse(localStorage.getItem(STORAGE_SLOTS_KEY));
}

function saveBookings(bookings) {
    localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(bookings));
}

function saveSlots(slots) {
    localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
}

// Global Dark Mode Control
function initTheme() {
    const isDark = localStorage.getItem("theme_dark") === "true";
    if (isDark) {
        document.body.classList.add("dark-mode");
    }
    
    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        toggleBtn.innerText = document.body.classList.contains("dark-mode") ? "☀️ โหมดสว่าง" : "🌙 โหมดมืด";
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            const dark = document.body.classList.contains("dark-mode");
            localStorage.setItem("theme_dark", dark);
            toggleBtn.innerText = dark ? "☀️ โหมดสว่าง" : "🌙 โหมดมืด";
        });
    }
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
