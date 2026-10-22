export const DEPARTMENTS = [
  {
    id: 'plant_cn',
    label: 'Plant C/N',
    subDepts: [
      'Production',
      'Production Engineering',
      'Maintenance',
      'Planning',
      'Procurement',
      'Others',
    ],
  },
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
 * Plant C/N sub-departments appear as "Plant C/N - Production", etc.
 */
export function getDepartmentOptions() {
  const options = [];
  DEPARTMENTS.forEach((dept) => {
    if (dept.subDepts) {
      dept.subDepts.forEach((sub) => {
        options.push({
          id: `${dept.id}_${sub.toLowerCase().replace(/[\s/]+/g, '_')}`,
          label: `${dept.label} - ${sub}`,
        });
      });
    } else {
      options.push({ id: dept.id, label: dept.label });
    }
  });
  return options;
}
