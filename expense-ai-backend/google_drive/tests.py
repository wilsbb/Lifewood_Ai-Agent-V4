from django.test import SimpleTestCase

from .views import _matches_folder_criteria


class FolderCriteriaTests(SimpleTestCase):
    def test_matches_when_all_keywords_exist_in_any_order(self):
        self.assertTrue(_matches_folder_criteria('Finance Lifewood'))
        self.assertTrue(_matches_folder_criteria('Lifewood Finance Reports'))
        self.assertTrue(_matches_folder_criteria('Finance - Lifewood Q1'))

    def test_matching_is_case_insensitive(self):
        self.assertTrue(_matches_folder_criteria('finance LIFEWOOD reports'))

    def test_rejects_missing_keywords(self):
        self.assertFalse(_matches_folder_criteria('Finance Dept'))
        self.assertFalse(_matches_folder_criteria('Lifewood Archive'))

    def test_rejects_partial_word_matches(self):
        self.assertFalse(_matches_folder_criteria('Financial Lifewooded'))
