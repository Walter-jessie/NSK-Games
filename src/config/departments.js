export const DEPARTMENTS = [
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    subDepts: ['Production', 'Production Engineering', 'Maintenance', 'Planning', 'Procurement'],
  },
  { id: 'itc', label: 'Indian Technical Centre' },
  { id: 'pte_sales', label: 'PTE Sales' },
  { id: 'industrial_sales', label: 'Industrial Sales' },
  { id: 'it', label: 'IT' },
  { id: 'supply_chain', label: 'Supply Chain, Business Control & Logistics' },
  { id: 'compliance', label: 'Compliance, Legal & Company Secretary' },
  { id: 'hr_ga', label: 'HR & GA' },
  { id: 'corporate_planning', label: 'Corporate Planning, Budgeting & Process' },
];

/**
 * Returns flat list of all selectable department options
 * Manufacturing sub-departments appear as "Manufacturing - Production", etc.
 */
export function getDepartmentOptions() {
  const options = [];
  DEPARTMENTS.forEach((dept) => {
    if (dept.subDepts) {
      dept.subDepts.forEach((sub) => {
        options.push({ id: `${dept.id}_${sub.toLowerCase().replace(/\s+/g, '_')}`, label: `${dept.label} - ${sub}` });
      });
    } else {
      options.push({ id: dept.id, label: dept.label });
    }
  });
  return options;
}
