import ExcelJS from 'exceljs';
import type { RequirementsDocument, TestCasesDocument } from '@qa-agent/shared';

function formatPreservedValues(values: Array<{ label: string; value: string; notes?: string }>): string {
  return values.map((value) => `${value.label}: ${value.value}${value.notes ? ` (${value.notes})` : ''}`).join('\n');
}

/** Renders a `requirements.json` document as an .xlsx workbook buffer for download. */
export async function buildRequirementsWorkbook(doc: RequirementsDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Requirements');
  sheet.columns = [
    { header: 'Requirement ID', key: 'requirementId', width: 15 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Source', key: 'source', width: 20 },
    { header: 'Testable', key: 'testable', width: 10 },
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Comments', key: 'comments', width: 40 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Example Values', key: 'exampleValues', width: 45 },
    { header: 'Structured Test Data', key: 'testData', width: 45 },
  ];
  for (const requirement of doc.requirements) {
    sheet.addRow({
      ...requirement,
      tags: requirement.tags.join(', '),
      comments: requirement.comments.join('\n'),
      notes: requirement.notes.join('\n'),
      exampleValues: formatPreservedValues(requirement.exampleValues),
      testData: formatPreservedValues(requirement.testData),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Renders a `testcases.json` document as an .xlsx workbook buffer for download. */
export async function buildTestCasesWorkbook(doc: TestCasesDocument): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Test Cases');
  sheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 15 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Preconditions', key: 'preconditions', width: 35 },
    { header: 'Steps', key: 'steps', width: 45 },
    { header: 'Expected Results', key: 'expectedResults', width: 45 },
    { header: 'Traceability', key: 'traceability', width: 20 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Comments', key: 'comments', width: 40 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Example Values', key: 'exampleValues', width: 45 },
    { header: 'Structured Test Data', key: 'testData', width: 45 },
  ];
  for (const testCase of doc.testCases) {
    sheet.addRow({
      ...testCase,
      preconditions: testCase.preconditions.join('\n'),
      steps: testCase.steps.join('\n'),
      expectedResults: testCase.expectedResults.join('\n'),
      traceability: testCase.traceability.join(', '),
      tags: testCase.tags.join(', '),
      comments: testCase.comments.join('\n'),
      notes: testCase.notes.join('\n'),
      exampleValues: formatPreservedValues(testCase.exampleValues),
      testData: formatPreservedValues(testCase.testData),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
