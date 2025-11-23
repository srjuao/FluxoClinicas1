# TypeScript Type Fixes - TODO

## Status
- ✅ Core infrastructure migrated (tsconfig, types, lib, contexts)
- ✅ UI components fully typed
- ✅ Main App and pages structure converted
- ⚠️ Modal components need type refinement (315 errors remaining)

## Approach

The project has been successfully migrated to TypeScript with all files converted from `.jsx` to `.tsx`. However, many components still have implicit `any` types that need explicit typing.

## Remaining Type Errors by Component

### High Priority (User-facing modals)
1. **CreateAppointmentModal** - ✅ FIXED
2. **CreateCertificateModal** - Needs patient type annotations
3. **CreatePrescriptionModal** - Needs patient/doctor type annotations  
4. **CreateUserModal** - Needs profile/doctor type annotations
5. **CreateReportModal** - Needs patient type annotations

### Medium Priority
6. **CreateClinicModal** - Needs clinic type annotations
7. **CreateClinicAdminModal** - Needs clinic type annotations
8. **ManageWorkHoursModal** - Needs work hours type annotations
9. **SearchReportsModal** - Needs report type annotations

### Lower Priority (Display components)
10. **ClinicCalendar** - Needs appointment type annotations
11. **DoctorAgenda** - Needs appointment type annotations
12. **ReceptionistCalendar** - Needs appointment type annotations
13. **PatientDetailsPage** - Needs patient/appointment type annotations

## Quick Fix Strategy

For components with many type errors, you can:

### Option 1: Add explicit types (Recommended)
```typescript
import type { Patient, Doctor } from '@/types/database.types';

const MyComponent: React.FC<MyComponentProps> = ({ prop1, prop2 }) => {
  const [data, setData] = useState<Patient[]>([]);
  // ...
};
```

### Option 2: Temporary bypass (for rapid development)
Add to top of file:
```typescript
// @ts-nocheck
```

### Option 3: Gradual typing
Add `// @ts-ignore` above specific problematic lines while fixing others.

## Common Type Patterns

### State with Supabase data
```typescript
const [patients, setPatients] = useState<Patient[]>([]);
const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
```

### Event handlers
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  // ...
};

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  // ...
};
```

### Supabase queries with types
```typescript
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('clinic_id', clinicId);

if (data) {
  setPatients(data); // TypeScript knows data is Patient[]
}
```

## Benefits of Full Typing

Once all components are properly typed:
- ✅ Catch bugs at compile time
- ✅ Better IDE autocomplete
- ✅ Safer refactoring
- ✅ Self-documenting code
- ✅ Easier onboarding for new developers

## Next Steps

1. Run `npx tsc --noEmit` to see all type errors
2. Fix one component at a time, starting with most-used modals
3. Test each component after fixing
4. Gradually remove any `@ts-nocheck` comments

## Commands

```bash
# Check all type errors
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/components/CreateUserModal.tsx

# Build (will show type errors)
npm run build
```
