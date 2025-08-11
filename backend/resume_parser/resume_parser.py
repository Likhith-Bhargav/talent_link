import os
import re
import json
import tempfile
from typing import Dict, List, Set
from collections import defaultdict
import PyPDF2
from docx import Document
import spacy
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from transformers import pipeline
import torch
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from collections import defaultdict

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

# Initialize spaCy model
try:
    print("Loading spaCy model...")
    nlp = spacy.load('en_core_web_lg')
    print("spaCy model loaded successfully")
except Exception as e:
    print(f"Error loading spaCy model: {str(e)}")
    nlp = spacy.blank('en')

# Dictionary of common abbreviations and their full forms
skill_abbreviations = {
    'ML': 'Machine Learning',
    'AI': 'Artificial Intelligence',
    'DL': 'Deep Learning',
    'NLP': 'Natural Language Processing',
    'CV': 'Computer Vision',
    'JS': 'JavaScript',
    'TS': 'TypeScript',
    'BE': 'Backend',
    'FE': 'Frontend',
    'FS': 'Full Stack',
    'DB': 'Database',
    'UI': 'User Interface',
    'UX': 'User Experience',
    'CI': 'Continuous Integration',
    'CD': 'Continuous Deployment',
    'AWS': 'Amazon Web Services',
    'GCP': 'Google Cloud Platform',
    'K8s': 'Kubernetes',
}

# Comprehensive skill database
SKILL_DB = {
    'Programming Languages': {
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'php', 'swift',
        'kotlin', 'go', 'rust', 'scala', 'perl', 'r', 'matlab', 'sql', 'bash', 'powershell'
    },
    'Web Technologies': {
        'html', 'css', 'react', 'angular', 'vue.js', 'node.js', 'express.js', 'django',
        'flask', 'spring', 'asp.net', 'jquery', 'bootstrap', 'tailwind', 'webpack',
        'graphql', 'rest api', 'web services', 'microservices'
    },
    'Databases': {
        'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle', 'sql server',
        'sqlite', 'cassandra', 'dynamodb', 'mariadb', 'neo4j', 'firebase', 'nosql'
    },
    'Cloud & DevOps': {
        'aws', 'azure', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'terraform',
        'ansible', 'circleci', 'github actions', 'gitlab ci', 'prometheus', 'grafana',
        'devops', 'ci/cd', 'cloud computing'
    },
    'AI & Data Science': {
        'machine learning', 'deep learning', 'neural networks', 'nlp', 'computer vision',
        'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'keras', 'opencv',
        'data analysis', 'data visualization', 'big data', 'hadoop', 'spark'
    },
    'Tools & Methodologies': {
        'git', 'jira', 'agile', 'scrum', 'kanban', 'tdd', 'unit testing', 'ci/cd',
        'rest', 'soap', 'design patterns', 'oop', 'functional programming'
    }
}

def clean_text(text):
    """Remove leading unwanted symbols and spaces."""
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    return text

def extract_email(text):
    """Extract the first valid email address from the text."""
    try:
        # First, try to find email in lines containing email-related keywords
        lines = text.lower().split('\n')
        for i, line in enumerate(lines):
            if any(keyword in line for keyword in ['email', 'e-mail', 'mail', '@']):
                # Search this line and the next few lines
                search_text = '\n'.join(lines[i:i+3])
                email_pattern = r'(?i)([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})'
                matches = re.findall(email_pattern, search_text)
                if matches:
                    return matches[0].strip()
        
        # If no email found in email-related sections, search entire text
        email_pattern = r'(?i)([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})'
        matches = re.findall(email_pattern, text)
        if matches:
            return matches[0].strip()
        
        print("Warning: No email found in text")
        return None
    except Exception as e:
        print(f"Error in email extraction: {str(e)}")
        return None

def extract_phone(text):
    """Extract the first valid phone number from the text."""
    phone_pattern = r'\+?\d{1,3}[-\s]?\(?\d{2,4}\)?[-\s]?\d{3,4}[-\s]?\d{3,4}'
    matches = re.findall(phone_pattern, text)
    for match in matches:
        phone = clean_text(match)
        phone = re.sub(r'[^\d+]', '', phone)
        if phone.startswith('+'):
            return phone
        elif len(phone) == 10:
            return f"{phone[:3]}-{phone[3:6]}-{phone[6:]}"
        elif len(phone) > 10:
            return phone
    return None

def extract_name(text):
    """Extract full name using multiple approaches."""
    try:
        # Get the first few chunks of text where names are typically found
        first_chunk = '\n'.join(text.split('\n')[:10])  # Look at first 5 lines
        
        # Method 1: Try to find name after common resume header patterns
        name_patterns = [
            r'(?i)name\s*[:-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})',
            r'(?i)^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*$',
            r'(?i)^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*[,\n]'
        ]
        
        for pattern in name_patterns:
            matches = re.findall(pattern, first_chunk)
            if matches:
                candidate = matches[0].strip()
                if len(candidate.split()) >= 2:
                    print(f"Found name using pattern matching: {candidate}")
                    return candidate
        
        # Method 2: Use spaCy NER
        doc = nlp(first_chunk)
        for ent in doc.ents:
            if ent.label_ == 'PERSON':
                name = ent.text.strip()
                if len(name.split()) >= 2:
                    print(f"Found name using NER: {name}")
                    return name
        
        # Method 3: Look for name-like patterns in the first few lines
        lines = [line.strip() for line in first_chunk.split('\n')]
        for line in lines:
            # Skip lines that are clearly not names
            if any(skip in line.lower() for skip in ['resume', 'cv', 'curriculum', 'vitae', '@', 'email', 'phone', 'address', 'http', 'www']):
                continue
            
            # Clean and check the line
            clean_line = ' '.join(word for word in line.split() if word.isalpha())
            words = clean_line.split()
            
            if 2 <= len(words) <= 4 and all(word[0].isupper() for word in words):
                print(f"Found name using fallback method: {clean_line}")
                return clean_line
        
        print("Warning: No name found in text")
        return None
    except Exception as e:
        print(f"Error in name extraction: {str(e)}")
        return None

def extract_text_from_pdf(pdf_file):
    """Extract text from PDF with better error handling and text cleaning."""
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ''
        for page in reader.pages:
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + '\n'
            except Exception as e:
                print(f"Error extracting text from PDF page: {str(e)}")
        
        if not text.strip():
            print("Warning: No text extracted from PDF")
            return ''
        
        # Clean up common PDF extraction issues
        text = re.sub(r'\s+', ' ', text)  # Replace multiple spaces with single space
        text = text.replace('\x0c', '\n')  # Replace form feed with newline
        text = '\n'.join(line.strip() for line in text.splitlines())
        return text
    except Exception as e:
        print(f"Error in PDF text extraction: {str(e)}")
        return ''

def extract_text_from_docx(docx_file):
    """Extract text from DOCX file."""
    try:
        doc = Document(docx_file)
        text = '\n'.join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        print(f"Error in DOCX text extraction: {str(e)}")
        return ''

def extract_skills_rule_based(text: str) -> Dict[str, Set[str]]:
    """Extract skills using exact keyword matching and common variations."""
    skills = defaultdict(set)
    text_lower = text.lower()
    
    try:
        # First check abbreviations and expand them
        for abbr, full_form in skill_abbreviations.items():
            if abbr.lower() in text_lower:
                # Find appropriate category for the skill
                for category, category_skills in SKILL_DB.items():
                    if full_form in category_skills:
                        skills[category].add(full_form)
                        break
        
        # Then check for exact matches from skill database
        for category, category_skills in SKILL_DB.items():
            for skill in category_skills:
                skill_lower = skill.lower()
                # Check for exact match or match with common separators
                if any(pattern in text_lower for pattern in [
                    skill_lower,
                    skill_lower.replace(' ', '-'),
                    skill_lower.replace(' ', '_'),
                    skill_lower.replace(' ', '')
                ]):
                    skills[category].add(skill)
        
        return skills
    except Exception as e:
        print(f"Error in rule-based extraction: {str(e)}")
        return defaultdict(set)

def extract_skills_ner(text: str) -> Dict[str, Set[str]]:
    """Extract skills using spaCy's NER."""
    if not nlp:
        print("NER model not available, skipping NER extraction")
        return defaultdict(set)
    
    try:
        skills = defaultdict(set)
        doc = nlp(text)
        
        # Extract skills from NER
        for ent in doc.ents:
            if ent.label_ == 'SKILL':
                # Clean and normalize the skill
                skill = clean_text(ent.text)
                if not skill:
                    continue
                    
                # Add to relevant categories
                skill_lower = skill.lower()
                for category, category_skills in SKILL_DB.items():
                    if any(s.lower() in skill_lower or skill_lower in s.lower() for s in category_skills):
                        skills[category].add(skill)
                        
                # If no category found, add to a general skills category
                if not any(skill in category_skills for skills in skills.values()):
                    skills['Other Skills'].add(skill)
        
        return skills
    except Exception as e:
        print(f"Error in NER extraction: {str(e)}")
        return defaultdict(set)

def extract_skills(text: str) -> Dict[str, List[str]]:
    """Hybrid skill extraction combining multiple approaches."""
    try:
        # Limit text size to prevent memory issues
        text = text[:100000]
        print("Starting skill extraction...")
        
        # Step 1: Rule-based extraction (fast, exact matches)
        print("Performing rule-based extraction...")
        rule_based_skills = extract_skills_rule_based(text)
        
        # Step 2: NER-based extraction (context-aware) - only if model is available
        ner_skills = defaultdict(set)
        if nlp:
            print("Performing NER-based extraction...")
            ner_skills = extract_skills_ner(text)
        
        # Merge results from all methods
        final_skills = defaultdict(set)
        
        # Always include rule-based skills as the baseline
        for category, skills in rule_based_skills.items():
            final_skills[category].update(skills)
        
        # Add NER skills if available
        if nlp:
            for category, skills in ner_skills.items():
                final_skills[category].update(skills)
        
        # Post-process: Remove duplicates and sort
        processed_skills = {}
        for category, skill_set in final_skills.items():
            if not skill_set:  # Skip empty categories
                continue
                
            # Remove skills that are substrings of others
            skills_list = sorted(skill_set, key=len, reverse=True)
            filtered_skills = []
            for skill in skills_list:
                if not any(skill in other and skill != other for other in filtered_skills):
                    filtered_skills.append(skill)
            
            if filtered_skills:  # Only include categories with skills
                processed_skills[category] = sorted(filtered_skills)
        
        print("Skill extraction completed")
        if not processed_skills:
            print("Warning: No skills were extracted")
            
        return processed_skills
        
    except Exception as e:
        print(f"Error in hybrid skill extraction: {str(e)}")
        return {}

def format_skills_for_display(skills_dict: Dict[str, List[str]]) -> str:
    """Format skills dictionary into a readable string for form display."""
    if not skills_dict:
        return ""
    
    formatted_skills = []
    for category, skills in skills_dict.items():
        if skills:
            formatted_skills.extend(skills)
    
    return ", ".join(formatted_skills)

def parse_resume_file(file_path: str) -> Dict:
    """Main function to parse a resume file and extract information."""
    try:
        # Extract text based on file type
        if file_path.lower().endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        elif file_path.lower().endswith('.docx'):
            text = extract_text_from_docx(file_path)
        else:
            raise ValueError("Unsupported file format. Please upload PDF or DOCX")
        
        if not text.strip():
            raise ValueError("No text could be extracted from the file")
        
        # Extract information
        name = extract_name(text)
        email = extract_email(text)
        phone = extract_phone(text)
        skills_dict = extract_skills(text)
        skills_string = format_skills_for_display(skills_dict)
        
        result = {
            'name': name or '',
            'email': email or '',
            'phone': phone or '',
            'skills': skills_string,
            'success': True,
            'message': 'Resume parsed successfully. Please review and edit the extracted information.'
        }
        
        return result
        
    except Exception as e:
        print(f"Error parsing resume: {str(e)}")
        return {
            'name': '',
            'email': '',
            'phone': '',
            'skills': '',
            'success': False,
            'message': f'Error parsing resume: {str(e)}'
        } 