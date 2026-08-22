import csv
import io
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional

# Tried in order against each row's date value. Covers the common cases
# (ISO format, and the two most common US slash/dash formats) without
# trying to guess every possible bank's date format.
DATE_FORMATS = ["%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y"]


def _parse_date(value: str) -> Optional[date]:
    value = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _parse_amount(value: str) -> Optional[Decimal]:
    # Strips common formatting banks add ($1,234.56) before parsing, and
    # always returns a positive value — this app treats every transaction
    # as an expense, with no signed/income concept, so we normalize here
    # rather than importing negative numbers that would behave oddly
    # everywhere else in the app.
    value = value.strip().replace("$", "").replace(",", "")
    if not value:
        return None
    try:
        return abs(Decimal(value))
    except InvalidOperation:
        return None


def _clean_header(name: str) -> str:
    # Excel often exports UTF-8 CSVs with a leading byte-order-mark, which
    # would otherwise silently glue itself onto the first column's name
    # (e.g. "\ufeffDate") and make header detection fail for no visible
    # reason.
    return name.replace("\ufeff", "").strip().lower()


def _detect_columns(fieldnames: List[str]) -> Optional[dict]:
    lower_map = {_clean_header(name): name for name in fieldnames if name}

    if "date" not in lower_map or "description" not in lower_map:
        return None

    if "amount" in lower_map:
        return {
            "date": lower_map["date"],
            "description": lower_map["description"],
            "format": "amount",
            "amount": lower_map["amount"],
        }

    if "debit" in lower_map and "credit" in lower_map:
        return {
            "date": lower_map["date"],
            "description": lower_map["description"],
            "format": "debit_credit",
            "debit": lower_map["debit"],
            "credit": lower_map["credit"],
        }

    return None


def parse_csv(csv_text: str, existing_transactions: List[dict]) -> dict:
    """
    existing_transactions: [{"transaction_date": date, "amount": Decimal, "description": str}, ...]
    for the target account, used to flag likely duplicates.

    Returns either {"error": "<message>"} if the CSV's structure itself is
    unusable, or {"rows": [...], "valid_count", "error_count", "duplicate_count"}.
    """
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        return {"error": "The file appears to be empty."}

    columns = _detect_columns(reader.fieldnames)
    if not columns:
        return {
            "error": (
                "CSV must have Date and Description columns, plus either an "
                "Amount column or both Debit and Credit columns."
            )
        }

    existing_keys = {
        (t["transaction_date"], t["amount"], t["description"].strip().lower())
        for t in existing_transactions
    }

    rows = []
    valid_count = 0
    error_count = 0
    duplicate_count = 0

    for i, raw_row in enumerate(reader, start=1):
        description = (raw_row.get(columns["description"]) or "").strip()
        date_str = raw_row.get(columns["date"]) or ""
        parsed_date = _parse_date(date_str)

        if columns["format"] == "amount":
            amount = _parse_amount(raw_row.get(columns["amount"]) or "")
        else:
            debit = _parse_amount(raw_row.get(columns["debit"]) or "")
            credit = _parse_amount(raw_row.get(columns["credit"]) or "")
            amount = debit if debit else credit

        if not description:
            rows.append({
                "row_number": i, "status": "error", "error_message": "Missing description",
                "description": description, "amount": None, "transaction_date": None,
            })
            error_count += 1
            continue

        if parsed_date is None:
            rows.append({
                "row_number": i, "status": "error", "error_message": f"Could not parse date: '{date_str}'",
                "description": description, "amount": None, "transaction_date": None,
            })
            error_count += 1
            continue

        if amount is None:
            rows.append({
                "row_number": i, "status": "error", "error_message": "Missing or invalid amount",
                "description": description, "amount": None, "transaction_date": parsed_date,
            })
            error_count += 1
            continue

        key = (parsed_date, amount, description.strip().lower())
        if key in existing_keys:
            rows.append({
                "row_number": i, "status": "duplicate", "error_message": "Matches an existing transaction",
                "description": description, "amount": amount, "transaction_date": parsed_date,
            })
            duplicate_count += 1
            continue

        rows.append({
            "row_number": i, "status": "valid", "error_message": None,
            "description": description, "amount": amount, "transaction_date": parsed_date,
        })
        valid_count += 1

    return {
        "rows": rows,
        "valid_count": valid_count,
        "error_count": error_count,
        "duplicate_count": duplicate_count,
    }