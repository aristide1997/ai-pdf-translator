#!/bin/bash

echo "Starting PDF Translator development server..."
echo "Visit http://localhost:8080 in your browser"
echo "Press Ctrl+C to stop"
echo ""

python3 -m http.server 8080
