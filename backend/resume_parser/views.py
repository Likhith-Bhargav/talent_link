import os
import tempfile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings

from .resume_parser import parse_resume_file

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parse_resume(request):
    """
    API endpoint to parse a resume file and extract structured information.
    
    Expected POST data:
    - resume: The resume file (PDF or DOCX)
    
    Returns:
    - 200: Successfully parsed resume with extracted data
    - 400: Invalid or missing file
    - 500: Error processing the file
    """
    if 'resume' not in request.FILES:
        return Response(
            {'error': 'No resume file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    resume_file = request.FILES['resume']
    
    # Validate file type
    file_ext = os.path.splitext(resume_file.name)[1].lower()
    if file_ext not in ['.pdf', '.docx']:
        return Response(
            {'error': 'Invalid file type. Please upload a PDF or DOCX file.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Save the file temporarily
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
    try:
        # Save the uploaded file to the temporary file
        for chunk in resume_file.chunks():
            temp_file.write(chunk)
        temp_file.close()
        
        # Parse the resume
        result = parse_resume_file(temp_file.name)
        
        # Add the original filename to the result
        result['filename'] = resume_file.name
        
        return Response(result)
        
    except Exception as e:
        return Response(
            {'error': f'Error processing resume: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        # Clean up the temporary file
        try:
            os.unlink(temp_file.name)
        except:
            pass
