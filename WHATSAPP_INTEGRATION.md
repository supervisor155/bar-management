# WhatsApp Integration Guide

## Overview
This guide explains how to integrate WhatsApp notifications and daily reports with your Bar Management System.

## 📱 Integration Options

### Option 1: WhatsApp Business API (Recommended for Production)
**Best for:** Large operations, automated messaging, official business accounts

#### Requirements:
- WhatsApp Business API account
- Facebook Business Manager account
- Verified business
- Server to host webhook

#### Steps:
1. **Sign up for WhatsApp Business API**
   - Go to: https://business.whatsapp.com/products/business-api
   - Complete verification process (1-2 weeks)
   - Cost: Varies by volume, starts free for small volumes

2. **Get API Credentials**
   - Phone Number ID
   - Access Token
   - Webhook URL

3. **Implementation Code** (Future enhancement)
   ```javascript
   // Example: Send daily report via WhatsApp Business API
   const sendWhatsAppReport = async (phoneNumber, reportData) => {
     const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
     
     const message = {
       messaging_product: 'whatsapp',
       to: phoneNumber,
       type: 'text',
       text: {
         body: `📊 Daily Sales Report
         
Date: ${reportData.date}
Total Revenue: ${reportData.revenue} RWF
Orders: ${reportData.orders}
Top Product: ${reportData.topProduct}

Low Stock Alerts: ${reportData.lowStock.length} items
         `
       }
     };

     const response = await fetch(url, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${ACCESS_TOKEN}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify(message)
     });

     return response.json();
   };
   ```

---

### Option 2: Twilio WhatsApp (Easy Setup)
**Best for:** Quick setup, small to medium operations

#### Requirements:
- Twilio account (free trial available)
- Verified phone number

#### Steps:
1. **Create Twilio Account**
   - Go to: https://www.twilio.com/whatsapp
   - Sign up for free trial ($15 credit)
   - Verify your phone number

2. **Enable WhatsApp Sandbox**
   - In Twilio Console, go to Messaging → Try it Out → Send a WhatsApp message
   - Follow instructions to activate sandbox
   - Get your Twilio credentials:
     - Account SID
     - Auth Token
     - WhatsApp Number (sandbox: +1 415 523 8886)

3. **Implementation Code**
   ```javascript
   // Install: npm install twilio
   const twilio = require('twilio');
   
   const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

   const sendDailyReport = async (toNumber, report) => {
     const message = await client.messages.create({
       from: 'whatsapp:+14155238886',  // Twilio sandbox number
       to: `whatsapp:${toNumber}`,     // e.g., +250788123456
       body: `📊 *Bar Daily Report*
       
📅 Date: ${report.date}
💰 Revenue: ${report.revenue.toLocaleString()} RWF
📦 Orders: ${report.totalOrders}
⭐ Top Product: ${report.topProduct}
       
${report.lowStock.length > 0 ? '⚠️ Low Stock Items:\n' + report.lowStock.join('\n') : '✅ All stock levels OK'}`
     });

     console.log('WhatsApp message sent:', message.sid);
   };
   ```

4. **Pricing**
   - Free trial: $15 credit (~500 messages)
   - Production: $0.005/message (very affordable)

---

### Option 3: Manual Export + WhatsApp (Current - Day 2 Ready!)
**Best for:** Immediate use, no API setup needed

#### ✅ Already Implemented Features:
1. **Export Daily Reports**
   - Go to Settings → Export & Backup
   - Choose "Last 7 Days" or "Last 30 Days"
   - Exports as CSV file

2. **Share via WhatsApp**
   - Mobile: Export → Share button → Select WhatsApp
   - Web: Export → Download → Manually send via WhatsApp Web

#### How to Use:
```
1. At end of day (e.g., 11 PM):
   - Open app
   - Go to Settings → Export & Backup
   - Tap "Last 7 Days" under Sales Reports
   - File downloads/shares

2. Send to Owner:
   - Mobile: Share directly to owner's WhatsApp
   - Web: Upload file to WhatsApp Web and send

3. Owner receives:
   - Complete CSV with all sales data
   - Can open in Excel/Google Sheets
   - Full visibility of day's business
```

---

## 📊 What Data to Send

### Daily Report Should Include:
- **Date and Time**
- **Revenue Summary**
  - Total sales: XXX RWF
  - Cash: XXX RWF
  - Card: XXX RWF  
  - Mobile Money: XXX RWF
- **Order Statistics**
  - Total orders: XX
  - Average order value: XXX RWF
- **Top 5 Products**
- **Low Stock Alerts** (items below minimum level)
- **Staff Performance** (optional)

### Weekly Report Format:
```
📊 WEEKLY REPORT
Week: Jun 20 - Jun 26, 2026

💰 Total Revenue: 2,450,000 RWF
📦 Total Orders: 487
📈 Avg Daily: 350,000 RWF

🏆 Top Products:
1. Primus Beer - 245 sold
2. Coca-Cola - 189 sold
3. Grilled Fish - 156 sold

⚠️ Stock Alerts: 3 items low
📅 Busiest Day: Saturday (450,000 RWF)
```

---

## 🔄 Automation Options (Future Enhancement)

### Option A: Scheduled Exports (React Native)
```javascript
// Using expo-task-manager and expo-background-fetch
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const DAILY_REPORT_TASK = 'daily-report-task';

TaskManager.defineTask(DAILY_REPORT_TASK, async () => {
  const report = await generateDailyReport();
  await sendWhatsAppReport(OWNER_PHONE, report);
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Schedule daily at 11 PM
await BackgroundFetch.registerTaskAsync(DAILY_REPORT_TASK, {
  minimumInterval: 86400, // 24 hours
  stopOnTerminate: false,
  startOnBoot: true,
});
```

### Option B: Cloud Function (Firebase/AWS)
```javascript
// Firebase Cloud Function - runs daily at 11 PM
exports.sendDailyReport = functions.pubsub
  .schedule('0 23 * * *')  // Cron: 11 PM daily
  .timeZone('Africa/Kigali')
  .onRun(async (context) => {
    const report = await fetchDailyReport();
    await sendWhatsAppMessage(report);
  });
```

---

## 💡 Implementation Roadmap

### Phase 1: Manual (✅ COMPLETED - Day 2)
- Export reports to CSV
- Manual sharing via WhatsApp
- **Status:** Ready to use today!

### Phase 2: Semi-Automated (Week 2-3)
- One-tap "Send Report to Owner" button
- Integrates with Twilio WhatsApp
- **Effort:** 4-6 hours development
- **Cost:** ~$10/month for 2000 messages

### Phase 3: Fully Automated (Month 2)
- Scheduled daily reports at specific time
- Automatic low-stock alerts
- WhatsApp Business API integration
- **Effort:** 1-2 weeks development
- **Cost:** ~$0-50/month depending on volume

---

## 🚀 Getting Started Today

### Immediate Actions (No code needed):
1. ✅ Use Export & Backup feature (already built!)
2. Create WhatsApp group: "Bar Daily Reports"
3. Add owner and manager to group
4. Set reminder on phone: "Export report at 11 PM"
5. Share exported file to group daily

### This Week (Optional):
1. Sign up for Twilio trial account
2. Test sandbox with your number
3. Request dev to add "Send via WhatsApp" button
4. Estimated time: 2-4 hours

### Next Month (For Growth):
1. Apply for WhatsApp Business API
2. Set up automated scheduling
3. Add real-time low-stock alerts
4. Implement customer notifications

---

## 📞 Testing WhatsApp Integration

### Test Checklist:
- [ ] Export daily sales report
- [ ] Share via WhatsApp to test number
- [ ] Verify format is readable
- [ ] Check file opens correctly on phone
- [ ] Test with different date ranges
- [ ] Verify low stock items show correctly

---

## 💰 Cost Summary

| Method | Setup Time | Monthly Cost | Automation Level |
|--------|-----------|--------------|------------------|
| Manual Export | 0 (Ready now!) | Free | Manual |
| Twilio Sandbox | 30 minutes | Free trial | Semi-auto |
| Twilio Production | 1 hour | $10-20 | Semi-auto |
| WhatsApp Business API | 1-2 weeks | $0-50 | Fully auto |

---

## 🎯 Recommended Approach

**For Day 2 Launch:** Use Manual Export (already built!)
- Zero setup time
- No additional cost
- Works immediately
- Manager exports and sends daily

**After 1 Month:** Upgrade to Twilio if business grows
- Still affordable
- Adds convenience
- 90% automated

**After 6 Months:** Consider WhatsApp Business API if scaling
- Professional solution
- Fully automated
- Best for multiple locations

---

## 📧 Support

For implementation help:
- Twilio Support: https://www.twilio.com/help
- WhatsApp Business API: https://business.whatsapp.com/support
- Developer: Contact your development team

---

## 📄 Additional Resources

- [Twilio WhatsApp Quickstart](https://www.twilio.com/docs/whatsapp/quickstart)
- [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [React Native Background Tasks](https://docs.expo.dev/versions/latest/sdk/background-fetch/)

---

**Note:** Phase 1 (Manual Export & Share) is fully functional and ready to use in your Day 2 deployment!

The automated features (Phase 2 & 3) can be added later as the business grows and requires more automation.
