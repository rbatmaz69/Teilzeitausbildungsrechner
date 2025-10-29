import pytest
from src.calculation_logic import calculate_gesamtdauer, format_ergebnis


# -------------------------------
# Basic Tests
# -------------------------------

def test_full_time_no_reduction():
    """Test normal training without part-time reduction."""
    result = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=100,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    assert result["finale_dauer_monate"] == 36
    assert result["verlaengerung_durch_teilzeit_monate"] == 0


def test_part_time_50_percent():
    """Test a typical part-time case with 50% workload."""
    result = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=50,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    # Should increase training duration due to reduced hours
    assert result["finale_dauer_monate"] > 36
    assert result["finale_dauer_monate"] <= 54  # Max 1.5× limit


def test_part_time_75_percent_with_reduction():
    """Test part-time case with both shortening factors."""
    result = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=75,
        verkuerzungsgruende={
            'abitur': True,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    # Expect shorter total time because of reduction
    assert result["finale_dauer_monate"] < 36
    assert result["verkuerzung_gesamt_monate"] > 0


def test_upper_limit_enforced():
    """Test that total duration never exceeds 1.5× the original duration."""
    result = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=50,  # Minimum allowed percentage
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    # Must be capped at 1.5× (i.e. 54 months)
    assert result["finale_dauer_monate"] == 54


# -------------------------------
# Edge Case Tests
# -------------------------------

def test_zero_percentage():
    """Check that 0% part-time raises an error."""
    with pytest.raises(ValueError):
        calculate_gesamtdauer(
            base_duration_months=36,
            vollzeit_stunden=40,
            teilzeit_input=0,
            verkuerzungsgruende={
                'abitur': False,
                'realschule': False,
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            },
            input_type='prozent'
        )


def test_negative_input():
    """Negative inputs for percentage must raise a ValueError."""
    with pytest.raises(ValueError):
        calculate_gesamtdauer(
            base_duration_months=36,
            vollzeit_stunden=40,
            teilzeit_input=-10,  # Negative percentage should fail
            verkuerzungsgruende={
                'abitur': False,
                'realschule': False,
                'alter_ueber_21': False,
                'vorkenntnisse_monate': 0
            },
            input_type='prozent'
        )


def test_rounding_behavior():
    """Ensure the final duration is always an integer (rounded months)."""
    result = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=70,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    assert isinstance(result["finale_dauer_monate"], int)


# -------------------------------
# Format Output Tests
# -------------------------------

def test_format_output_contains_key_values():
    """Check that formatted output includes key information."""
    result = calculate_gesamtdauer(
        base_duration_months=36,
        vollzeit_stunden=40,
        teilzeit_input=80,
        verkuerzungsgruende={
            'abitur': False,
            'realschule': False,
            'alter_ueber_21': False,
            'vorkenntnisse_monate': 0
        },
        input_type='prozent'
    )
    output = format_ergebnis(result)
    # Verify important text elements are in the formatted string
    assert "BERECHNUNGSERGEBNIS TEILZEITAUSBILDUNG" in output
    assert "Finale Ausbildungsdauer" in output
    assert str(result["finale_dauer_monate"]) in output
