# PayGoFit Admin Guide: QR Code Check-in System

## Overview

The QR code check-in system allows users to scan a QR code at fitness centers to mark their attendance for booked sessions. This helps track user attendance and ensures that users are checking in at the correct center.

## How it Works

1. Each fitness center has a unique QR code
2. Users book sessions at centers through the app
3. When users arrive at the center, they scan the center's QR code
4. The system validates that:
   - The user has a confirmed booking for that day
   - The scanned QR code matches the center where the booking was made
   - The booking is for the current day
5. If all validations pass, the user's attendance is marked in the system

## Generating QR Codes for Centers

### QR Code Format

Each center's QR code should contain a payload in the following format:
```
paygo-center:CENTER_ID
```

Where `CENTER_ID` is the unique identifier for the center in the database.

### Steps to Generate QR Codes

1. **Get the Center ID**: 
   - This is the ID of the center in the Firestore database
   - You can find this in the Firebase Console under the 'centers' collection

2. **Generate the QR Code**:
   - Using a QR code generator (online tools or apps), create a QR code with the text:
     `paygo-center:YOUR_CENTER_ID`
   - Example: If the center ID is `abc123`, the QR code should contain `paygo-center:abc123`

3. **Print the QR Code**:
   - Print the QR code with the center name clearly displayed
   - Laminate the printed code for durability
   - Display it prominently at the center's check-in desk

### Recommended QR Code Generators

- [QR Code Generator](https://www.qr-code-generator.com/)
- [QRCode Monkey](https://www.qrcode-monkey.com/)
- [QR Code API for automated generation](https://goqr.me/api/)

## Managing Attendance in the Admin Panel

1. **View Attendance Records**:
   - In the admin panel, navigate to the 'Bookings' section
   - Bookings with attendance marked will show 'Attended' status
   - Bookings without attendance marked will show 'Not Attended' status

2. **Manual Attendance Override**:
   - If needed, admins can manually mark attendance
   - Find the booking in the admin panel
   - Click the "Mark as Attended" button

3. **Attendance Reports**:
   - Generate reports of attendance by center, date range, or user
   - Export reports as CSV or PDF for record-keeping

## Troubleshooting

### Common Issues

1. **User Can't Scan QR Code**:
   - Ensure the QR code is clearly printed and visible
   - Check that the user has camera permissions enabled
   - Verify the user has a good internet connection

2. **Attendance Not Marking**:
   - Verify the user has a confirmed booking for the current day
   - Check that the user is scanning the correct center's QR code
   - Ensure the booking hasn't already been marked as attended

3. **Invalid QR Code Error**:
   - Verify the QR code follows the correct format (`paygo-center:CENTER_ID`)
   - Regenerate the QR code if necessary

### Support Contact

For technical issues with the QR code system, please contact the development team at:
- Email: dev@paygofit.com
- Phone: (555) 123-4567 