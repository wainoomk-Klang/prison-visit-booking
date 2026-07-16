# คู่มือการติดตั้งระบบขึ้นใช้งานจริง (Deployment Guide)
## การเชื่อมต่อ Google Drive และ Google Sheets ผ่าน Google Apps Script (ฟรี 100%)

เพื่อให้ระบบสามารถรองรับการจองเยี่ยมออนไลน์ พร้อมเก็บข้อมูลลงใน Google Sheets และอัปโหลดไฟล์รูปภาพความละเอียดสูง (ไม่ย่อขนาด) ไปยัง Google Drive โดยอัตโนมัติ คุณสามารถทำตามขั้นตอนได้ดังนี้:

---

### ขั้นตอนที่ 1: เตรียมโครงสร้างโฟลเดอร์บน Google Drive

1. เปิด Google Drive ของหน่วยงานหรือส่วนตัวขึ้นมา
2. สร้างโฟลเดอร์หลักขึ้นมาใหม่ ตั้งชื่อว่า: `เยี่ยมใกล้ชิด_2569_ไม่บีบอัด`
3. ดับเบิ้ลคลิกเข้าไปในโฟลเดอร์นั้น แล้วทำการก๊อปปี้ **Folder ID** จาก URL บนเบราว์เซอร์
   * *ตัวอย่าง URL:* `https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I0J`
   * *Folder ID คือส่วนท้ายสุด:* `1A2B3C4D5E6F7G8H9I0J`

---

### ขั้นตอนที่ 2: เตรียม Google Sheets สำหรับบันทึกประวัติการจอง

1. สร้าง Google Sheets ใหม่บนบัญชีของคุณ ตั้งชื่อว่า `ประวัติการลงทะเบียนเยี่ยมใกล้ชิด`
2. ก๊อปปี้ **Spreadsheet ID** จาก URL ของ Google Sheets เช่นกัน
   * *ตัวอย่าง URL:* `https://docs.google.com/spreadsheets/d/1X2Y3Z4W5V6U7T8S/edit`
   * *Spreadsheet ID คือ:* `1X2Y3Z4W5V6U7T8S`
3. ตั้งชื่อหัวตารางในแถวแรก (Row 1) ดังนี้:
   * **คอลัมน์ A**: วันที่ทำรายการ (Timestamp)
   * **คอลัมน์ B**: เลขประจำตัวผู้ต้องขัง (Inmate CID)
   * **คอลัมน์ C**: ชื่อ-นามสกุล ผู้ต้องขัง
   * **คอลัมน์ D**: แดนคุมขัง (Zone)
   * **คอลัมน์ E**: วันเวลานัดหมายเข้าเยี่ยม (Slot Naming)
   * **คอลัมน์ F**: ข้อมูลญาติผู้เข้าเยี่ยมทั้งหมด (JSON / Text)
   * **คอลัมน์ G**: ลิงก์โฟลเดอร์เอกสารบน Google Drive (Drive Link)
   * **คอลัมน์ H**: สถานะคิวการจอง (Status)

---

### ขั้นตอนที่ 3: เขียนโค้ดหลังบ้านด้วย Google Apps Script

1. ในหน้าต่าง Google Sheets ของคุณ ให้คลิกที่เมนู **ส่วนขยาย (Extensions)** -> **Apps Script**
2. ลบโค้ดเดิมทั้งหมดในไฟล์ `รหัส.gs` (หรือ `Code.gs`) แล้วนำโค้ดภาษา JavaScript ด้านล่างนี้ไปวาง:

```javascript
// กำหนดโฟลเดอร์ปลายทางและไฟล์สเปรดชีต
var DRIVE_FOLDER_ID = "1Wc3rSGmYgX_2A9g7TDhVAUOIt4dXNsMK"; // รหัสโฟลเดอร์ของคุณ
var SHEET_ID = "ใส่_SPREADSHEET_ID_ของสเปรดชีตที่ก๊อปมา_ที่นี่";

// ดึงข้อมูลหรือค้นหาข้อมูลผู้ต้องขัง (READ / SEARCH)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    
    // กรณีที่ 1: ค้นหาข้อมูลผู้ต้องขังจากแผ่นงาน "รายชื่อผู้ต้องขัง"
    if (e.parameter.action === "search_inmate") {
      var searchKey = String(e.parameter.key).trim().replace(/\s+/g, "");
      var inmateSheet = ss.getSheetByName("รายชื่อผู้ต้องขัง");
      
      if (!inmateSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "ไม่พบแผ่นงานชื่อ 'รายชื่อผู้ต้องขัง' ใน Google Sheets กรุณาสร้างแผ่นงานใหม่และกรอกรายชื่อผู้ต้องขัง"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var inmateData = inmateSheet.getDataRange().getValues();
      // คอลัมน์ที่ต้องการค้นหา: A (รหัสผู้ต้องขัง) หรือ C (เลขบัตรประชาชน)
      for (var i = 1; i < inmateData.length; i++) {
        var inmateCode = String(inmateData[i][0]).trim().replace(/\s+/g, "");
        var citizenId = String(inmateData[i][2]).trim().replace(/\s+/g, "");
        
        if (inmateCode === searchKey || citizenId === searchKey) {
          var fullName = String(inmateData[i][1]).trim();
          var nameParts = fullName.split(/\s+/);
          var firstName = nameParts[0] || "";
          var lastName = nameParts.slice(1).join(" ") || "";
          
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            found: true,
            data: {
              inmateCode: String(inmateData[i][0]).trim(),
              citizenId: String(inmateData[i][2]).trim(),
              name: firstName,
              surname: lastName,
              grade: String(inmateData[i][3]).trim() || "ชั้นกลาง"
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        found: false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // กรณีที่ 2: ดึงข้อมูลประวัติการจองทั้งหมดในระบบ (สำหรับหน้า Admin และเช็คผลคิว)
    var sheet = ss.getSheets()[0]; // ดึงแผ่นงานหน้าแรก (ฐานข้อมูลการจอง)
    var data = sheet.getDataRange().getValues();
    var bookings = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var nameStr = String(row[2]);
      
      bookings.push({
        dateBooked: row[0],
        inmateId: row[1],
        inmateName: nameStr.split(" ").slice(1).join(" ") || nameStr,
        inmateTitle: nameStr.split(" ")[0] || "",
        inmateSurname: nameStr.split(" ").slice(-1)[0] || "",
        zone: row[3],
        slotText: row[4],
        visitors: row[5],
        driveFolderUrl: row[6],
        status: row[7],
        slot: getSlotCode(row[3], row[4])
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: bookings
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// จัดการการส่งข้อมูลเข้าผ่านระบบเว็บ (CREATE / UPDATE)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    // ตรวจสอบว่าเป็นคำสั่งอัปเดตสถานะคิวจอง (แอดมินอนุมัติ/ปฏิเสธ)
    if (data.action === "update_status") {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.inmateId) {
          sheet.getCell(i + 1, 8).setValue(data.status); // คอลัมน์ H (หลักที่ 8) คือสถานะ
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "อัปเดตสถานะคิวสำเร็จ"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "ไม่พบข้อมูลเลขบัตรประชาชนผู้ต้องขังนี้ในสเปรดชีต"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // --- กรณีเป็นคำสั่งจองคิวใหม่ ---
    var inmateCid = data.inmateId;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][1] === inmateCid && rows[i][7] !== "rejected") {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "ผู้ต้องขังรายนี้มีสิทธิ์การจองแล้วในระบบ ไม่สามารถจองซ้ำได้"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // สร้างโฟลเดอร์ย่อยใน Google Drive
    var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var inmateFolder = parentFolder.createFolder("ผู้ต้องขัง_" + inmateCid + "_" + String(data.inmateFullName).replace(/\s+/g, "_"));
    
    // บันทึกไฟล์รูปถ่ายเอกสารที่ส่งมาจากฟอร์ม (ภาพความละเอียดสูง แบบ Base64)
    if (data.inmateDocBase64) {
      saveFileToDrive(inmateFolder, data.inmateDocName, data.inmateDocBase64);
    }
    
    data.visitors.forEach(function(visitor, idx) {
      if (visitor.idCardBase64) {
        saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_บัตรประชาชน_" + visitor.cid, visitor.idCardBase64);
      }
      if (visitor.relationBase64) {
        saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_ทะเบียนบ้าน_" + visitor.cid, visitor.relationBase64);
      }
      if (visitor.extraBase64) {
        saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_เอกสารสมรสหรือรับรอง_" + visitor.cid, visitor.extraBase64);
      }
    });

    // บันทึกข้อมูลทั้งหมดลงสเปรดชีต
    sheet.appendRow([
      new Date(),
      inmateCid,
      data.inmateFullName,
      data.zone,
      data.slotText,
      JSON.stringify(data.visitors),
      inmateFolder.getUrl(), // ลิงก์ตรงของโฟลเดอร์บน Google Drive
      "pending" // สถานะเริ่มต้นเป็นรอตรวจสอบเอกสาร
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      driveLink: inmateFolder.getUrl(),
      message: "ลงทะเบียนจองสิทธิ์สำเร็จ และจัดส่งไฟล์เข้าระบบ Google Drive เรียบร้อย"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันแปลงและบันทึกไฟล์ภาพแบบไม่ย่อขนาด
function saveFileToDrive(folder, fileName, base64Data) {
  var rawData = base64Data.split(",")[1];
  var decodedData = Utilities.base64Decode(rawData);
  var blob = Utilities.newBlob(decodedData, "image/jpeg", fileName);
  folder.createFile(blob);
}

// ฟังก์ชันช่วยเดาค่ารอบ
function getSlotCode(zone, slotText) {
  var isPm = slotText.indexOf("บ่าย") > -1;
  return "zone" + zone + "_" + (isPm ? "pm" : "am");
}
```

3. กดปุ่มบันทึก (แผ่นดิสก์)
4. คลิกที่ปุ่ม **ทำให้ใช้งานได้ (Deploy)** -> **การจัดการการทำให้ใช้งานได้ใหม่... (New deployment)**
5. เลือกประเภทการทำงานเป็น **เว็บแอป (Web App)**
6. ตั้งค่าการเข้าถึงดังนี้:
   * **เรียกใช้งานในฐานะ (Execute as)**: *ฉันเอง (Your Google Account)*
   * **ผู้มีสิทธิ์เข้าถึง (Who has access)**: *ทุกคน (Anyone)*
7. กด **ทำให้ใช้งานได้ (Deploy)**
8. ระบบจะแสดงป๊อปอัปให้คุณเลือกอีเมลและกด **Allow (อนุญาตสิทธิ์)** ในการเชื่อมต่อ Drive และ Sheet
9. เมื่อเสร็จสิ้น คุณจะได้ **URL เว็บแอป (Web app URL)** มา
   * *ตัวอย่าง URL:* `https://script.google.com/macros/s/AKfycb.../exec`
   * นำ URL นี้ไปอัปเดตใส่ในไฟล์ `app.js` ของฝั่งหน้าเว็บจองคิว เพื่อส่งข้อมูลยิงผ่าน API จริง

---

### ขั้นตอนที่ 4: เผยแพร่เว็บไซต์ลงทะเบียนออนไลน์ฟรี (Deploy Web Static)

คุณสามารถนำไฟล์เว็บต้นแบบ (`index.html`, `booking.html`, `admin.html`, `styles.css`, `app.js`) ไปวางไว้บนโฮสติ้งฟรีระดับโลกที่เสถียรและเร็วมากอย่าง **Vercel** หรือ **GitHub Pages** ได้ทันทีโดยไม่มีค่าบริการรายเดือน เพื่อเปิดลิงก์ให้ญาติๆ เข้าใช้งานผ่านมือถือได้ตลอด 24 ชั่วโมงครับ
