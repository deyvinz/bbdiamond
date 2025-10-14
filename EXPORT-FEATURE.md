# Custom Export Feature

## Overview
Implemented a comprehensive export feature for both **Invitations** and **Guests** with customizable filters and column selection.

## Features

### 1. **Export Dialog UI**
- Clean, user-friendly interface with filters and column selection
- Mobile-responsive design
- Real-time export summary
- Reset filters functionality

### 2. **Filters**
- **Event Filter**: Export data for specific events or all events
- **RSVP Status Filter**: Filter by pending, accepted, declined, or waitlist status
- Filters are applied server-side for accurate results across the entire database

### 3. **Column Selection**
- Select/deselect individual columns to export
- "Select All" / "Deselect All" quick actions
- Default columns pre-selected for convenience
- Visual feedback when no columns are selected

### 4. **Server-Side Export**
- Exports **all matching data from the database**, not just the current page
- Handles large datasets efficiently
- Proper CSV formatting with quote escaping
- Chronologically sorted events by `starts_at` date

## Files Created

### Invitations Export
1. **`app/admin/invitations/ExportDialog.tsx`**
   - Export dialog component for invitations
   - Available columns:
     - Guest Name (default)
     - Email (default)
     - Invite Code (default)
     - Events (default)
     - RSVP Status (default)
     - Headcount (default)
     - Invitation Token
     - Created Date

2. **`app/api/admin/invitations/export/route.ts`**
   - API endpoint: `GET /api/admin/invitations/export`
   - Query parameters:
     - `eventId`: Filter by event ID (or 'all')
     - `status`: Filter by RSVP status (or 'all')
     - `columns`: Comma-separated list of column IDs to export
   - Returns CSV file with proper headers

### Guests Export
1. **`app/admin/guests/ExportDialog.tsx`**
   - Export dialog component for guests
   - Available columns:
     - First Name (default)
     - Last Name (default)
     - Email (default)
     - Invite Code (default)
     - Events (default)
     - RSVP Status (default)
     - Headcount (default)
     - Dietary Restrictions
     - Notes
     - Created Date

2. **`app/api/admin/guests/export/route.ts`**
   - API endpoint: `GET /api/admin/guests/export`
   - Query parameters:
     - `eventId`: Filter by event ID (or 'all')
     - `status`: Filter by RSVP status (or 'all')
     - `columns`: Comma-separated list of column IDs to export
   - Returns CSV file with proper headers

## Files Modified

### Invitations
1. **`app/admin/invitations/page.tsx`**
   - Added `getEventsPage()` import and fetch
   - Pass events to `InvitationsClient`

2. **`app/admin/invitations/InvitationsClient.tsx`**
   - Added `ExportDialog` import
   - Added `showExportDialog` state
   - Modified `handleExport()` to open dialog instead of exporting current page
   - Added `events` prop to interface
   - Render `ExportDialog` component

3. **`app/admin/invitations/InvitationsTable.tsx`**
   - Added `events` prop to interface
   - Populate event dropdown filter with actual events

### Guests
1. **`app/admin/guests/page.tsx`**
   - Added `getEventsPage()` import and fetch
   - Pass events to `GuestsClient`

2. **`app/admin/guests/GuestsClient.tsx`**
   - Added `ExportDialog` import
   - Added `showExportDialog` state
   - Modified `handleExport()` to open dialog instead of exporting current page
   - Added `events` prop to interface
   - Render `ExportDialog` component

## Usage

### For Invitations
1. Navigate to **Admin > Invitations**
2. Click the **"Export"** button in the table header
3. In the dialog:
   - Select an event filter (or leave as "All Events")
   - Select an RSVP status filter (or leave as "All Status")
   - Check/uncheck columns you want to export
4. Review the export summary
5. Click **"Export CSV"**
6. The CSV file will download automatically

### For Guests
1. Navigate to **Admin > Guests**
2. Click the **"Export"** button in the table header
3. Follow the same steps as invitations export

## Technical Details

### CSV Format
- Proper CSV escaping for special characters (commas, quotes, newlines)
- UTF-8 encoding
- One row per event per guest (if multiple events selected)
- Empty rows for guests with no matching events (when filters applied)

### Data Handling
- **Server-side filtering**: Ensures accurate data across entire database
- **Event sorting**: Events are sorted chronologically by `starts_at` date
- **Relationship handling**: Properly joins guests, invitations, invitation_events, and events tables
- **Performance**: Uses Supabase select with proper joins for efficient queries

### Error Handling
- Validates that at least one column is selected
- Handles API errors gracefully with toast notifications
- Provides loading states during export
- Console logging for debugging

## Benefits

1. **Flexibility**: Users can export exactly the data they need
2. **Performance**: Server-side export handles large datasets efficiently
3. **Accuracy**: Exports all matching data from database, not just current page
4. **User Experience**: Clean UI with clear feedback and validation
5. **Consistency**: Same export experience for both invitations and guests

## Future Enhancements (Optional)

- Add date range filters for created_at
- Export to other formats (Excel, JSON)
- Scheduled/automated exports
- Export templates (save filter/column preferences)
- Bulk export for multiple events at once
- Export history/audit log

