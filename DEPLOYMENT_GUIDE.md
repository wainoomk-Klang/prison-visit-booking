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
   * **คอลัมน์ I**: ข้อมูล JSON ดิบ (Raw Data)
   * **คอลัมน์ J**: หมายเหตุ/เหตุผลกรณีปฏิเสธ (Remarks)

---

### ขั้นตอนที่ 3: เขียนโค้ดหลังบ้านด้วย Google Apps Script

1. ในหน้าต่าง Google Sheets ของคุณ ให้คลิกที่เมนู **ส่วนขยาย (Extensions)** -> **Apps Script**
2. ลบโค้ดเดิมทั้งหมดในไฟล์ `รหัส.gs` (หรือ `Code.gs`) แล้วนำโค้ดภาษา JavaScript ด้านล่างนี้ไปวาง:

```javascript
// กำหนดโฟลเดอร์ปลายทางและไฟล์สเปรดชีต
var DRIVE_FOLDER_ID = "1Wc3rSGmYgX_2A9g7TDhVAUOIt4dXNsMK"; // รหัสโฟลเดอร์ของคุณ
var SHEET_ID = "1Z7G93AvXlzOvv4a7iz9Jzfr2QHwXAs3yRIGrnmHTfSo";

// 1. ค้นหาข้อมูลผู้ต้องขัง (READ / SEARCH)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    
    // ค้นหาผู้ต้องขังรายบุคคล (สำหรับตรวจสอบสิทธิ์ลงจองคิว)
    if (e.parameter.action === "search_inmate") {
      var searchKey = String(e.parameter.key).trim().replace(/\s+/g, "");
      var inmateSheet = ss.getSheetByName("รายชื่อผู้ต้องขัง");
      
      if (!inmateSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "ไม่พบแผ่นงานชื่อ 'รายชื่อผู้ต้องขัง' ใน Google Sheets"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var inmateData = inmateSheet.getDataRange().getValues();
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
              grade: String(inmateData[i][6]).trim() || "ชั้นกลาง",
              zone: String(inmateData[i][8]).trim() || "",
              disciplinedDetails: inmateData[i][9] ? String(inmateData[i][9]).trim() : ""
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        found: false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ค้นหาสถานะการจองคิวรายบุคคลสำหรับญาติสืบค้น
    if (e.parameter.action === "check_booking") {
      var searchKey = String(e.parameter.key).trim().replace(/\s+/g, "");
      
      var targetId = searchKey;
      var inmateSheet = ss.getSheetByName("รายชื่อผู้ต้องขัง");
      if (inmateSheet) {
        var inmateData = inmateSheet.getDataRange().getValues();
        for (var i = 1; i < inmateData.length; i++) {
          var inmateCode = String(inmateData[i][0]).trim().replace(/\s+/g, "");
          var citizenId = String(inmateData[i][2]).trim().replace(/\s+/g, "");
          if (inmateCode === searchKey) {
            targetId = citizenId;
            break;
          }
        }
      }
      
      var sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      
      for (var i = data.length - 1; i >= 1; i--) {
        var rowInmateId = String(data[i][1]).trim().replace(/\s+/g, "");
        if (rowInmateId === targetId || rowInmateId === searchKey) {
          var nameStr = String(data[i][2]);
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            found: true,
            data: {
              dateBooked: data[i][0],
              inmateId: data[i][1],
              inmateName: nameStr,
              zone: data[i][3],
              slotText: data[i][4],
              driveFolderUrl: data[i][6],
              status: data[i][7],
              remarks: data[i][9] || "",
              visitorsJson: data[i][8] || ""
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        found: false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ตรวจสอบรหัสผ่านของแอดมินเจ้าหน้าที่
    if (e.parameter.action === "verify_password") {
      var pass = e.parameter.password;
      var correctPass = "wainoom1234";
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        authorized: (pass === correctPass)
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ดึงประวัติการจองทั้งหมดสำหรับ Admin
    var sheet = ss.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var bookings = [];
    
    if (lastRow >= 2) {
      var range = sheet.getRange(2, 1, lastRow - 1, 10);
      var data = range.getValues();
      
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        bookings.push({
          dateBooked: row[0],
          inmateId: row[1],
          inmateName: String(row[2]),
          inmateTitle: "",
          inmateSurname: "",
          zone: row[3],
          slotText: row[4],
          visitors: row[8] || row[5],
          driveFolderUrl: row[6],
          status: row[7],
          remarks: row[9] || "",
          slot: getSlotCode(row[3], row[4])
        });
      }
    }
    
    bookings.reverse();
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

// รับข้อมูลลงทะเบียน (CREATE / UPDATE)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000); // กันคิวกดพร้อมกันชนกันในระบบ
  
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    
    // 1. อัปเดตสถานะคิวจอง (แอดมินอนุมัติ/ปฏิเสธ)
    if (data.action === "update_status") {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).trim() === String(data.inmateId).trim()) {
          sheet.getRange(i + 1, 8).setValue(data.status); // อัปเดตคอลัมน์ H
          if (data.remarks !== undefined) {
            sheet.getRange(i + 1, 10).setValue(data.remarks); // อัปเดตคอลัมน์ J
          }
          SpreadsheetApp.flush();
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "อัปเดตสถานะคิวสำเร็จ"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "ไม่พบข้อมูลเลขบัตรประชาชนผู้ต้องขังในระบบ"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. จองใหม่ หรือยื่นเอกสารแก้ไข (Resubmit)
    var inmateCid = String(data.inmateId).trim();
    var rows = sheet.getDataRange().getValues();
    var existingRowIndex = -1;
    var existingFolderUrl = "";
    
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]).trim() === inmateCid) {
        if (rows[i][7] !== "rejected") {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "ผู้ต้องขังรายนี้มีสิทธิ์การจองแล้วในระบบ ไม่สามารถจองซ้ำได้"
          })).setMimeType(ContentService.MimeType.JSON);
        } else {
          existingRowIndex = i + 1;
          existingFolderUrl = String(rows[i][6]).trim();
        }
      }
    }
    
    // จัดการโฟลเดอร์ Google Drive (ใช้โฟลเดอร์เดิม หรือสร้างโฟลเดอร์ใหม่เพียงอันเดียวถ้าไม่มี)
    var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var inmateFolder;
    var folderUrl = "";
    
    if (existingRowIndex > 0 && existingFolderUrl) {
      var folderId = existingFolderUrl.split("/").pop();
      try {
        inmateFolder = DriveApp.getFolderById(folderId);
        folderUrl = existingFolderUrl;
      } catch (err) {}
    }
    
    if (!inmateFolder) {
      var folderName = String(data.inmateFullName).replace(/\s+/g, "_") + "_แดน_" + data.zone;
      var existingFolders = parentFolder.getFoldersByName(folderName);
      if (existingFolders.hasNext()) {
        inmateFolder = existingFolders.next();
      } else {
        inmateFolder = parentFolder.createFolder(folderName);
      }
      folderUrl = inmateFolder.getUrl();
    }
    
    // บันทึกไฟล์ภาพลง Drive
    if (data.inmateDocBase64) {
      saveFileToDrive(inmateFolder, data.inmateDocName || (inmateCid + "_เอกสารผู้ต้องขัง.jpg"), data.inmateDocBase64);
    }
    
    if (data.visitors && data.visitors.length > 0) {
      data.visitors.forEach(function(visitor, idx) {
        if (visitor.idCardBase64) {
          saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_บัตรประชาชน_" + visitor.cid, visitor.idCardBase64);
        }
        if (visitor.relationBase64) {
          saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_ทะเบียนบ้าน_" + visitor.cid, visitor.relationBase64);
        }
        if (visitor.extraBase64) {
          saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_ทะเบียนสมรส_" + visitor.cid, visitor.extraBase64);
        }
        if (visitor.extra2Base64) {
          saveFileToDrive(inmateFolder, "ญาติ_" + (idx+1) + "_หนังสือรับรอง_" + visitor.cid, visitor.extra2Base64);
        }
      });
    }

    var visitorsText = "";
    if (data.visitors && data.visitors.length > 0) {
      visitorsText = data.visitors.map(function(visitor, idx) {
        return (idx + 1) + ". " + visitor.title + visitor.name + " " + visitor.surname + " (" + visitor.relation + ") โทร: " + visitor.tel;
      }).join("\n");
    }

    if (existingRowIndex > 0) {
      sheet.getRange(existingRowIndex, 1).setValue(new Date());
      sheet.getRange(existingRowIndex, 3).setValue(data.inmateFullName);
      sheet.getRange(existingRowIndex, 4).setValue(data.zone);
      sheet.getRange(existingRowIndex, 5).setValue(data.slotText);
      sheet.getRange(existingRowIndex, 6).setValue(visitorsText);
      sheet.getRange(existingRowIndex, 7).setValue(folderUrl);
      sheet.getRange(existingRowIndex, 8).setValue("pending");
      sheet.getRange(existingRowIndex, 9).setValue(JSON.stringify(data.visitors));
      sheet.getRange(existingRowIndex, 10).setValue("");
    } else {
      sheet.appendRow([
        new Date(),
        inmateCid,
        data.inmateFullName,
        data.zone,
        data.slotText,
        visitorsText, 
        folderUrl, 
        "pending", 
        JSON.stringify(data.visitors),
        ""
      ]);
    }

    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      driveLink: folderUrl,
      message: "ลงทะเบียนจองสิทธิ์สำเร็จ"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

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
