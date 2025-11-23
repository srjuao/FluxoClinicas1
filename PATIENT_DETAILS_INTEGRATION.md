# Patient Details Page Integration Guide

## Overview
The Patient Details Page provides a comprehensive view of patient information including:
- Previous medical reports (anamneses)
- Exams (when implemented)
- Internal notes/chat (when implemented)
- Quick actions (create report, certificate, prescription, mark as attended)

## Design
The page follows the existing application design system:
- Glass-morphism effects (`glass-effect` class)
- Gradient buttons (`gradient-primary`, `gradient-secondary`)
- Smooth animations with Framer Motion
- Responsive 3-column layout

## Usage

### 1. From Doctor Dashboard
The patient details page is already integrated in the Doctor Dashboard. When a doctor clicks "Atender" on an appointment, it navigates to the patient details page.

```jsx
// In DoctorDashboard.jsx
<DoctorAgenda
  doctorId={doctorData.id}
  clinicId={clinicId}
  onSelectPatient={(patient) => {
    setSelectedPatientId(patient.id);
    setShowPatientDetails(true);
  }}
/>
```

### 2. From Receptionist Dashboard
To integrate in the Receptionist Dashboard, add similar state management:

```jsx
const [showPatientDetails, setShowPatientDetails] = useState(false);
const [selectedPatientId, setSelectedPatientId] = useState(null);

// In render, before the main return:
if (showPatientDetails && selectedPatientId) {
  return (
    <PatientDetailsPage
      patientId={selectedPatientId}
      onBack={() => {
        setShowPatientDetails(false);
        setSelectedPatientId(null);
      }}
    />
  );
}
```

### 3. Using the PatientDetailsButton Component
For quick integration in any component:

```jsx
import PatientDetailsButton from '@/components/PatientDetailsButton';

<PatientDetailsButton
  patient={patient}
  onViewDetails={(patient) => {
    setSelectedPatientId(patient.id);
    setShowPatientDetails(true);
  }}
/>
```

## Features

### Current Features
- ✅ Display patient basic information (name, birth date, age)
- ✅ List all previous medical reports with doctor information
- ✅ Create new anamnesis directly from patient page
- ✅ Glass-morphism design matching the app style
- ✅ Smooth animations and transitions
- ✅ Back navigation

### Action Buttons
- **Nova Anamnese** - Opens CreateReportModal with patient pre-selected
- **Atestado** - Placeholder for certificate generation
- **Receita** - Placeholder for prescription generation
- **Paciente Atendido** - Mark patient as attended (to be implemented)
- **Pedido de Exame** - Request exam (to be implemented)
- **Paciente não Atendido** - Mark as not attended (to be implemented)

### Pending Features (TODO)
- ⏳ Exams section - Requires `exams` table
- ⏳ Internal chat/notes - Requires `patient_notes` table
- ⏳ Certificate generation integration
- ⏳ Prescription generation integration
- ⏳ Appointment status updates
- ⏳ Exam requests

## Database Requirements

### Current Tables Used
- `patients` - Patient information
- `medical_reports` - Anamnesis records
- `doctors` - Doctor information
- `profiles` - User profiles

### Future Tables Needed
```sql
-- For exams section
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  clinic_id UUID REFERENCES clinics(id),
  doctor_id UUID REFERENCES doctors(id),
  title TEXT NOT NULL,
  exam_type TEXT,
  result TEXT,
  date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- For internal notes/chat
CREATE TABLE patient_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  clinic_id UUID REFERENCES clinics(id),
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Styling Classes Used
- `glass-effect` - Frosted glass background
- `gradient-primary` - Purple gradient (primary actions)
- `gradient-secondary` - Blue/teal gradient (avatars)
- Tailwind utility classes for responsive layout

## Navigation Flow
```
DoctorDashboard
  └─> DoctorAgenda
       └─> Click "Atender" on appointment
            └─> PatientDetailsPage
                 ├─> View previous reports
                 ├─> Create new anamnesis
                 └─> Back to dashboard
```

## Props

### PatientDetailsPage
```typescript
interface PatientDetailsPageProps {
  patientId: string;  // UUID of the patient
  onBack: () => void; // Callback to return to previous view
}
```

## Example Integration in Custom Component

```jsx
import React, { useState } from 'react';
import PatientDetailsPage from '@/pages/PatientDetailsPage';

const MyComponent = () => {
  const [viewingPatient, setViewingPatient] = useState(null);

  if (viewingPatient) {
    return (
      <PatientDetailsPage
        patientId={viewingPatient}
        onBack={() => setViewingPatient(null)}
      />
    );
  }

  return (
    <div>
      {/* Your component content */}
      <button onClick={() => setViewingPatient(patientId)}>
        View Patient Details
      </button>
    </div>
  );
};
```

## Security Considerations
- Row-level security (RLS) should be enforced at the database level
- Only users from the same clinic should access patient data
- Doctor-specific actions should verify doctor role
