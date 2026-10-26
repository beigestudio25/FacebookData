#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit tests for Egyptian phone number extraction (Python implementation).
Tests positive and negative boundary cases.
"""

import re
from typing import List, Dict

ARABIC_INDIC_DIGITS = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۴': '4', '۵': '5', '۶': '6'
}

CARRIERS_MAP = {
    "010": "فودافون",
    "011": "اتصالات",
    "012": "أورنج",
    "015": "وي"
}

def normalize_arabic_digits(text: str) -> str:
    if not text:
        return ""
    for ar, en in ARABIC_INDIC_DIGITS.items():
        text = text.replace(ar, en)
    return text

# Exact regex with digit boundaries and no un-prefixed 10-digit numbers:
PHONE_REGEX = re.compile(
    r'(?<!\d)(?:(?:\+|00)?20[\s.-]?0?1[0125]|01[0125])(?:[\s.-]?\d){8}(?!\d)'
)

def extract_egyptian_phones(raw_text: str) -> List[Dict[str, str]]:
    if not raw_text:
        return []

    clean_text = normalize_arabic_digits(raw_text)
    matches = PHONE_REGEX.finditer(clean_text)
    results = []
    seen = set()

    for m in matches:
        full_match = m.group(0)
        digits = re.sub(r'\D', '', full_match)

        local_num = None
        if digits.startswith("20") and len(digits) == 12:
            local_num = "0" + digits[2:]
        elif digits.startswith("01") and len(digits) == 11:
            local_num = digits
        elif digits.startswith("0020") and len(digits) == 14:
            local_num = "0" + digits[4:]

        if local_num and len(local_num) == 11 and local_num not in seen:
            prefix = local_num[:3]
            if prefix in CARRIERS_MAP:
                seen.add(local_num)
                results.append({
                    "raw": full_match.strip(),
                    "local": local_num,
                    "carrier": CARRIERS_MAP[prefix]
                })

    return results

def run_tests():
    print("Running Python Phone Extraction Tests...")

    # Positive Tests
    p1 = extract_egyptian_phones("تواصل معي على 01012345678 الآن")
    assert len(p1) == 1 and p1[0]["local"] == "01012345678", f"Failed 01012345678: {p1}"

    p2 = extract_egyptian_phones("الدولي +201012345678 متاح واتساب")
    assert len(p2) == 1 and p2[0]["local"] == "01012345678", f"Failed +201012345678: {p2}"

    p3 = extract_egyptian_phones("موبايل ٠١٠١٢٣٤٥٦٧٨ فون")
    assert len(p3) == 1 and p3[0]["local"] == "01012345678", f"Failed Eastern Arabic: {p3}"

    p4 = extract_egyptian_phones("مفصول بمسافات 010 1234 5678 اتصال")
    assert len(p4) == 1 and p4[0]["local"] == "01012345678", f"Failed spaced: {p4}"

    # Multiple distinct phones
    p_multi = extract_egyptian_phones("01012345678 01112345678")
    assert len(p_multi) == 2, f"Failed two numbers: {p_multi}"
    assert p_multi[0]["local"] == "01012345678" and p_multi[1]["local"] == "01112345678"

    # Negative Tests (Must NOT match)
    n1 = extract_egyptian_phones("كود الشحنة 3101234567800 شحن")
    assert len(n1) == 0, f"Negative test failed for 3101234567800: {n1}"

    n2 = extract_egyptian_phones("السعر المطلوب 1012345678 جنيه")
    assert len(n2) == 0, f"Negative test failed for 10-digit price 1012345678: {n2}"

    n3 = extract_egyptian_phones("رقم المعاملة 20101234567890123 بنك")
    assert len(n3) == 0, f"Negative test failed for 20101234567890123: {n3}"

    print("✅ All Python phone extraction tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
