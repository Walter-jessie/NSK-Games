export const DEPARTMENTS = [
  { id: 'plant_cn', label: 'Plant C/N' },
  { id: 'itc', label: 'ITC' },
  { id: 'pte_sales', label: 'PT&EE Sales' },
  { id: 'bcld', label: 'BCLD' },
  { id: 'accounts_finance', label: 'Accounts & Finance' },
  { id: 'corporate_planning', label: 'Corporate Planning' },
  { id: 'industrial_business_unit', label: 'Industrial Business Unit' },
  { id: 'others', label: 'Others' },
];

/**
 * Returns flat list of all selectable department options
 */
export function getDepartmentOptions() {
  return DEPARTMENTS.map((dept) => ({ id: dept.id, label: dept.label }));
}
