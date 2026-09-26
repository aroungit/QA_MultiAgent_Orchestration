import ExcelJS from 'exceljs';
import type { RequirementsDocument, TestCasesDocument } from '@qa-agent/shared';

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
  ];
  for (const requirement of doc.requirements) {
    sheet.addRow({ ...requirement, tags: requirement.tags.join(', ') });
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
  ];
  for (const testCase of doc.testCases) {
    sheet.addRow({
      ...testCase,
      preconditions: testCase.preconditions.join('\n'),
      steps: testCase.steps.join('\n'),
      expectedResults: testCase.expectedResults.join('\n'),
      traceability: testCase.traceability.join(', '),
      tags: testCase.tags.join(', '),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
