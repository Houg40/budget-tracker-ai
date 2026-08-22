from datetime import date
from decimal import Decimal

from csv_import import parse_csv


def test_valid_rows_are_parsed_correctly():
    csv_text = (
        "Date,Description,Amount\n"
        "2026-08-01,Grocery Store,54.32\n"
        "2026-08-03,Coffee Shop,4.75\n"
    )
    result = parse_csv(csv_text, existing_transactions=[])

    assert result["valid_count"] == 2
    assert result["error_count"] == 0
    assert result["duplicate_count"] == 0
    assert result["rows"][0]["status"] == "valid"
    assert result["rows"][0]["transaction_date"] == date(2026, 8, 1)
    assert result["rows"][0]["description"] == "Grocery Store"
    assert result["rows"][0]["amount"] == Decimal("54.32")


def test_debit_credit_format_resolves_to_single_amount():
    csv_text = (
        "Date,Description,Debit,Credit\n"
        "2026-08-02,Paycheck,,1500.00\n"
        "2026-08-04,Rent,1200.00,\n"
    )
    result = parse_csv(csv_text, existing_transactions=[])

    assert result["valid_count"] == 2
    assert result["rows"][0]["amount"] == Decimal("1500.00")
    assert result["rows"][1]["amount"] == Decimal("1200.00")


def test_mixed_valid_and_invalid_rows_flag_specific_errors():
    csv_text = (
        "Date,Description,Amount\n"
        "2026-08-01,Good Row,25.00\n"
        "not-a-date,Bad Date Row,10.00\n"
        "2026-08-02,,15.00\n"
        "2026-08-03,Bad Amount Row,abc\n"
        "2026-08-04,Another Good Row,42.10\n"
    )
    result = parse_csv(csv_text, existing_transactions=[])

    assert result["valid_count"] == 2
    assert result["error_count"] == 3
    statuses = [row["status"] for row in result["rows"]]
    assert statuses == ["valid", "error", "error", "error", "valid"]
    assert "Could not parse date" in result["rows"][1]["error_message"]
    assert result["rows"][2]["error_message"] == "Missing description"
    assert result["rows"][3]["error_message"] == "Missing or invalid amount"


def test_duplicate_rows_are_flagged_not_errored():
    csv_text = "Date,Description,Amount\n2026-08-01,Grocery Store,54.32\n"
    existing = [
        {
            "transaction_date": date(2026, 8, 1),
            "amount": Decimal("54.32"),
            "description": "Grocery Store",
        }
    ]

    result = parse_csv(csv_text, existing_transactions=existing)

    assert result["duplicate_count"] == 1
    assert result["valid_count"] == 0
    assert result["error_count"] == 0
    assert result["rows"][0]["status"] == "duplicate"


def test_header_only_file_returns_zero_rows_without_crashing():
    csv_text = "Date,Description,Amount\n"
    result = parse_csv(csv_text, existing_transactions=[])

    assert result["rows"] == []
    assert result["valid_count"] == 0
    assert result["error_count"] == 0
    assert result["duplicate_count"] == 0


def test_completely_empty_file_returns_a_structural_error():
    result = parse_csv("", existing_transactions=[])

    assert result == {"error": "The file appears to be empty."}


def test_missing_required_columns_returns_a_structural_error():
    csv_text = "Foo,Bar\n1,2\n"
    result = parse_csv(csv_text, existing_transactions=[])

    assert "error" in result
    assert "Date and Description" in result["error"]
