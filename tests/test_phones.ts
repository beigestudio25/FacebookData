/**
 * Unit tests for Egyptian phone number extraction (TypeScript implementation).
 * Tests positive and negative boundary cases.
 */

import { extractEgyptianPhones } from '../src/utils/regex.ts';

function runTests() {
  console.log('Running TypeScript Phone Extraction Tests...');

  // Positive Tests
  const p1 = extractEgyptianPhones('تواصل معي على 01012345678 الآن');
  if (p1.length !== 1 || p1[0].normalized !== '01012345678') {
    throw new Error(`Failed 01012345678: ${JSON.stringify(p1)}`);
  }

  const p2 = extractEgyptianPhones('الدولي +201012345678 متاح واتساب');
  if (p2.length !== 1 || p2[0].normalized !== '01012345678') {
    throw new Error(`Failed +201012345678: ${JSON.stringify(p2)}`);
  }

  const p3 = extractEgyptianPhones('موبايل ٠١٠١٢٣٤٥٦٧٨ فون');
  if (p3.length !== 1 || p3[0].normalized !== '01012345678') {
    throw new Error(`Failed Eastern Arabic: ${JSON.stringify(p3)}`);
  }

  const p4 = extractEgyptianPhones('مفصول بمسافات 010 1234 5678 اتصال');
  if (p4.length !== 1 || p4[0].normalized !== '01012345678') {
    throw new Error(`Failed spaced: ${JSON.stringify(p4)}`);
  }

  // Multiple distinct phones
  const pMulti = extractEgyptianPhones('01012345678 01112345678');
  if (pMulti.length !== 2 || pMulti[0].normalized !== '01012345678' || pMulti[1].normalized !== '01112345678') {
    throw new Error(`Failed two numbers: ${JSON.stringify(pMulti)}`);
  }

  // Negative Tests (Must NOT match)
  const n1 = extractEgyptianPhones('كود الشحنة 3101234567800 شحن');
  if (n1.length !== 0) {
    throw new Error(`Negative test failed for 3101234567800: ${JSON.stringify(n1)}`);
  }

  const n2 = extractEgyptianPhones('السعر المطلوب 1012345678 جنيه');
  if (n2.length !== 0) {
    throw new Error(`Negative test failed for 10-digit price 1012345678: ${JSON.stringify(n2)}`);
  }

  const n3 = extractEgyptianPhones('رقم المعاملة 20101234567890123 بنك');
  if (n3.length !== 0) {
    throw new Error(`Negative test failed for 20101234567890123: ${JSON.stringify(n3)}`);
  }

  console.log('✅ All TypeScript phone extraction tests PASSED successfully!');
}

runTests();
