export type BenefitFieldType = 'text' | 'money' | 'select' | 'date' | 'checkbox' | 'presets' | 'suffix'

export type BenefitOption = { value: string; label: string }

export type BenefitField = {
  key: string
  label: string
  type: BenefitFieldType
  placeholder?: string
  options?: BenefitOption[]
  presets?: string[]
  suffix?: string
  defaultValue?: string | boolean
  readOnly?: boolean
  note?: string
}

export type BenefitSection = {
  help: string
  fields: BenefitField[]
}

export type BenefitType = {
  id: string
  code: string
  tabLabel: string
  menuLabel: string
  left: BenefitSection[]
  right: BenefitSection[]
}

const APPLICABILITY: BenefitOption[] = [
  { value: 'THIS_YEAR', label: 'This tax year only' },
  { value: 'THIS_AND_NEXT', label: 'This tax year and the following tax year' },
]

const TAX_METHOD: BenefitOption[] = [
  { value: 'P11D', label: 'P11D (after year end)' },
  { value: 'PAYROLLED', label: 'Payrolled (through payroll)' },
]

const FUEL_TYPES: BenefitOption[] = [
  { value: '', label: '- Select -' },
  { value: 'PETROL', label: 'Petrol' },
  { value: 'DIESEL', label: 'Diesel' },
  { value: 'HYBRID_PETROL', label: 'Hybrid — petrol' },
  { value: 'HYBRID_DIESEL', label: 'Hybrid — diesel' },
  { value: 'ELECTRIC', label: 'Electric' },
  { value: 'OTHER', label: 'Other' },
]

const applicability: BenefitSection = {
  help: 'Does the benefit apply to this tax year only, or the following as well?',
  fields: [
    {
      key: 'applicability',
      label: 'Applicability',
      type: 'select',
      options: APPLICABILITY,
      defaultValue: 'THIS_YEAR',
    },
  ],
}

const taxMethod: BenefitSection = {
  help: 'Select how tax collected on this benefit should be accounted for.',
  fields: [
    {
      key: 'taxMethod',
      label: 'Tax accounting method',
      type: 'select',
      options: TAX_METHOD,
      defaultValue: 'P11D',
    },
  ],
}

const optionalDescription = (key = 'description', label = 'Description'): BenefitSection => ({
  help: 'Optionally enter a description (not included on P11D)',
  fields: [{ key, label, type: 'text' }],
})

const cashEquivalent: BenefitSection = {
  help: 'The cash equivalent is the benefit value minus the employee contribution.',
  fields: [{ key: 'cashEquivalent', label: 'Cash equivalent', type: 'money' }],
}

const taxablePayment: BenefitSection = {
  help: 'The taxable payment is calculated as the value minus the employee contribution.',
  fields: [{ key: 'taxablePayment', label: 'Taxable payment', type: 'money' }],
}

const employeeContribution: BenefitSection = {
  help: 'Enter the amount made good or from which tax was deducted.',
  fields: [
    {
      key: 'employeeContribution',
      label: 'Employee contribution',
      type: 'money',
      defaultValue: '0.00',
    },
  ],
}

const hmrcDescription = (key: string, label: string, presets: string[]): BenefitSection => ({
  help: "Enter a description, or choose from one of HMRC's preset options.",
  fields: [{ key, label, type: 'presets', presets }],
})

export const BENEFIT_TYPES: BenefitType[] = [
  {
    id: 'A',
    code: 'A',
    tabLabel: 'Assets Transferred',
    menuLabel: 'Assets transferred (cars, property, goods or other assets)',
    left: [
      hmrcDescription('description', 'Description of asset', ['Car', 'Property', 'Goods', 'Other assets']),
      {
        help: 'Enter, as appropriate, either the market value of the asset at the date of transfer, or a figure based on the cost to you.',
        fields: [{ key: 'cost', label: 'Cost / Market value', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'B',
    code: 'B',
    tabLabel: 'Payment On Behalf',
    menuLabel: 'Payments made on behalf of employee',
    left: [
      hmrcDescription('description', 'Description of payment', [
        "Payment of employee's personal bill",
        'Settlement of a debt',
        'Other payment',
      ]),
      {
        help: 'Enter the amount that your employee should have paid, but you paid instead.',
        fields: [{ key: 'cashEquivalent', label: 'Cash equivalent', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'B2',
    code: 'B',
    tabLabel: 'Tax on Notional Payments',
    menuLabel: 'Tax on notional payments',
    left: [
      optionalDescription(),
      {
        help: 'Enter tax on notional payments not borne by employee within 90 days of the end of the tax year.',
        fields: [{ key: 'tax', label: 'Tax', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'C',
    code: 'C',
    tabLabel: 'Voucher / Credit Card',
    menuLabel: 'Vouchers and credit cards',
    left: [
      optionalDescription(),
      {
        help: 'Enter the value of vouchers and payments made using credit cards or tokens.',
        fields: [{ key: 'grossAmount', label: 'Gross amount', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [
      {
        help: 'How should Class 1 NICs be handled?',
        fields: [
          {
            key: 'nicsExempt',
            label: 'Voucher is exempt from Class 1 NICs',
            type: 'checkbox',
            defaultValue: false,
            note: "To account for the voucher's Class 1 NICs liability, you must manually add a notional addition (deducting NICs only) in the relevant pay period(s) for this employee.",
          },
        ],
      },
      cashEquivalent,
      applicability,
      taxMethod,
    ],
  },
  {
    id: 'D',
    code: 'D',
    tabLabel: 'Accommodation',
    menuLabel: 'Living accommodation',
    left: [
      optionalDescription(),
      {
        help: 'Enter the cash equivalent of accommodation provided for employee, or his/her family or household.',
        fields: [{ key: 'cashEquivalent', label: 'Cash equivalent', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'E',
    code: 'E',
    tabLabel: 'Mileage Allowance',
    menuLabel: 'Mileage allowance and passenger payments',
    left: [
      optionalDescription(),
      {
        help: "Enter the excess over and above the approved amount of car and mileage allowances paid to employee for business travel in employee's own vehicle, and passenger payments.",
        fields: [{ key: 'taxableAmount', label: 'Taxable amount', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'F',
    code: 'F',
    tabLabel: 'Car & Fuel',
    menuLabel: 'Car and fuel',
    left: [
      {
        help: 'Enter the details of the car.',
        fields: [
          { key: 'makeModel', label: 'Make and model', type: 'text' },
          { key: 'registration', label: 'Vehicle registration number', type: 'text' },
          { key: 'dateFirstRegistered', label: 'Date first registered', type: 'date' },
          { key: 'co2', label: 'CO2 emissions', type: 'suffix', suffix: 'g/km' },
          { key: 'zeroEmissionsMiles', label: 'Zero emissions mileage', type: 'suffix', suffix: 'miles' },
          { key: 'engineSize', label: 'Engine size', type: 'suffix', suffix: 'cc' },
          {
            key: 'fuelType',
            label: 'Type of fuel/power used',
            type: 'select',
            options: FUEL_TYPES,
            defaultValue: '',
          },
        ],
      },
      {
        help: 'Enter the dates the car was available to the employee in this tax year.',
        fields: [
          { key: 'availableFrom', label: 'From', type: 'date' },
          { key: 'availableTo', label: 'To', type: 'date' },
        ],
      },
    ],
    right: [
      {
        help: 'The list price should include car and standard accessories only.',
        fields: [
          { key: 'listPrice', label: 'List price', type: 'money' },
          { key: 'accessories', label: 'Non-standard accessories', type: 'money' },
        ],
      },
      {
        help: 'Enter amounts paid by the employee towards the car.',
        fields: [
          { key: 'capitalContributions', label: 'Capital contributions', type: 'money' },
          { key: 'privateUsePaid', label: 'Amount paid for private use', type: 'money' },
          {
            key: 'privateFuelPaid',
            label: 'Cost of private fuel is paid for by employer',
            type: 'checkbox',
            defaultValue: false,
          },
        ],
      },
      {
        help: 'Cash equivalent of the car benefit for this tax year.',
        fields: [{ key: 'cashEquivalent', label: 'Cash equivalent of car', type: 'money' }],
      },
      taxMethod,
    ],
  },
  {
    id: 'G',
    code: 'G',
    tabLabel: 'Vans & Fuel',
    menuLabel: 'Vans and fuel',
    left: [
      optionalDescription(),
      {
        help: 'Enter the total cash equivalent of all vans made available in the 2026/27 tax year.',
        fields: [{ key: 'vansEquivalent', label: 'Cash equivalent of vans', type: 'money' }],
      },
      {
        help: 'Enter the total cash equivalent of fuel for all vans made available in the 2026/27 tax year.',
        fields: [{ key: 'fuelEquivalent', label: 'Cash equivalent of fuel', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'H',
    code: 'H',
    tabLabel: 'Loan',
    menuLabel: 'Interest-free or low interest loans',
    left: [
      optionalDescription(),
      {
        help: 'If applicable, enter the number of joint borrowers between whom the total cash equivalent is shared.',
        fields: [
          {
            key: 'jointBorrowers',
            label: 'Number of joint borrowers',
            type: 'text',
            placeholder: 'If applicable',
          },
        ],
      },
      {
        help: 'If a date below is in the 2026/27 tax year, it must be entered.',
        fields: [
          { key: 'dateMade', label: 'Date loan made', type: 'date' },
          { key: 'dateDischarged', label: 'Date loan discharged', type: 'date' },
        ],
      },
      applicability,
      taxMethod,
    ],
    right: [
      {
        help: 'Enter the starting balance at the start of the tax year (or when the loan was made) and the closing balance at the end of the tax year (or when the loan was discharged).',
        fields: [
          { key: 'startingBalance', label: 'Starting balance', type: 'money' },
          { key: 'closingBalance', label: 'Closing balance', type: 'money' },
          { key: 'maximumBalance', label: 'Maximum balance during year', type: 'money' },
          { key: 'interestPaid', label: 'Total interest paid by borrower in year', type: 'money' },
        ],
      },
      {
        help: 'Cash equivalent of loan after deducting any interest paid by the borrower.',
        fields: [
          {
            key: 'cashEquivalent',
            label: 'Cash equivalent',
            type: 'money',
            defaultValue: '0.00',
            readOnly: true,
          },
        ],
      },
    ],
  },
  {
    id: 'I',
    code: 'I',
    tabLabel: 'Medical Treatment/Insurance',
    menuLabel: 'Private medical treatment or insurance',
    left: [
      optionalDescription(),
      {
        help: 'Enter the cost of the private medical treatment or insurance.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'J',
    code: 'J',
    tabLabel: 'Qualifying Relocation',
    menuLabel: 'Qualifying relocation expenses payments and benefits',
    left: [
      optionalDescription(),
      {
        help: 'Enter the excess over £8,000 of all qualifying relocation expenses payments and benefits for each move.',
        fields: [{ key: 'excessAmount', label: 'Excess amount', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'K',
    code: 'K',
    tabLabel: 'Services',
    menuLabel: 'Services supplied',
    left: [
      optionalDescription(),
      {
        help: 'Enter the cost of the services supplied to the employee.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'L',
    code: 'L',
    tabLabel: 'Asset at Disposal',
    menuLabel: "Assets placed at the employee's disposal",
    left: [
      hmrcDescription('description', 'Description of asset', [
        'Computer',
        'Furniture',
        'Yacht or boat',
        'Aircraft',
        'Other asset',
      ]),
      {
        help: 'Enter the annual value of the use of the asset including expenses incurred.',
        fields: [{ key: 'value', label: 'Value', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'M',
    code: 'M',
    tabLabel: 'Other (Class 1A)',
    menuLabel: 'Other items (Class 1A)',
    left: [
      hmrcDescription('description', 'Description of item', [
        'Subscriptions',
        'Professional fees',
        'Other Class 1A item',
      ]),
      {
        help: 'Enter the cost of the item.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'N',
    code: 'N',
    tabLabel: 'Other (Non-Class 1A)',
    menuLabel: 'Other items (Non-Class 1A)',
    left: [
      hmrcDescription('description', 'Description of item', [
        'Subscriptions',
        'Professional fees',
        'Other non-Class 1A item',
      ]),
      {
        help: 'Enter the cost of the item.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'O',
    code: 'O',
    tabLabel: 'Director Tax',
    menuLabel: "Income Tax paid but not deducted from director's remuneration",
    left: [
      optionalDescription(),
      {
        help: "Enter amount of Income Tax paid but not deducted from director's remuneration.",
        fields: [{ key: 'taxPaid', label: 'Tax paid', type: 'money' }],
      },
    ],
    right: [applicability, taxMethod],
  },
  {
    id: 'P',
    code: 'P',
    tabLabel: 'Travelling & Subsistence',
    menuLabel: 'Travelling and subsistence payments',
    left: [
      optionalDescription(),
      {
        help: 'Enter the total expenses reimbursed.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [taxablePayment, applicability, taxMethod],
  },
  {
    id: 'Q',
    code: 'Q',
    tabLabel: 'Entertainment',
    menuLabel: 'Entertainment',
    left: [
      optionalDescription(),
      {
        help: 'Enter the cost of all payments made exclusively for entertaining.',
        fields: [
          { key: 'cost', label: 'Cost', type: 'money' },
          {
            key: 'tradingDisallow',
            label: 'Trading organisation disallow indicator',
            type: 'checkbox',
            defaultValue: false,
          },
        ],
      },
      employeeContribution,
    ],
    right: [cashEquivalent, applicability, taxMethod],
  },
  {
    id: 'R',
    code: 'R',
    tabLabel: 'Home Telephone',
    menuLabel: 'Payments for use of home telephone',
    left: [
      optionalDescription(),
      {
        help: 'Enter any expenses reimbursed in connection with a phone at the home of the employee where the employee contracted directly with the supplier.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [taxablePayment, applicability, taxMethod],
  },
  {
    id: 'S',
    code: 'S',
    tabLabel: 'Non-Qualifying Relocation',
    menuLabel: 'Non-qualifying relocation expenses',
    left: [
      optionalDescription(),
      {
        help: 'Enter any amounts that your employees should have paid, but you paid instead, in connection with a relocation, where the expense was not an exempt expense.',
        fields: [{ key: 'cost', label: 'Cost', type: 'money' }],
      },
      employeeContribution,
    ],
    right: [taxablePayment, applicability, taxMethod],
  },
  {
    id: 'T',
    code: 'T',
    tabLabel: 'Other Expenses',
    menuLabel: 'Other expenses',
    left: [
      {
        help: 'Enter details of expenses incurred in, or in connection with, the provision for the director/employee of any benefits or facilities of whatever their nature not covered under any other benefit.',
        fields: [
          { key: 'description', label: 'Description', type: 'text' },
          { key: 'cost', label: 'Cost', type: 'money' },
        ],
      },
      employeeContribution,
    ],
    right: [taxablePayment, applicability, taxMethod],
  },
]

export function benefitTypeById(id: string) {
  return BENEFIT_TYPES.find((item) => item.id === id)
}

export function benefitNumber(id: string) {
  const index = BENEFIT_TYPES.findIndex((item) => item.id === id)
  return index >= 0 ? index + 1 : null
}

export function defaultValuesFor(type: BenefitType) {
  const values: Record<string, string | boolean> = {}
  for (const section of [...type.left, ...type.right]) {
    for (const field of section.fields) {
      values[field.key] = field.defaultValue ?? (field.type === 'checkbox' ? false : '')
    }
  }
  return values
}
