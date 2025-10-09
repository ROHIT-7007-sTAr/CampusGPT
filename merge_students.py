
import json

def merge_students(file1, dept1, file2, dept2, output_file):
    with open(file1, 'r') as f:
        data1 = json.load(f)
    for student in data1:
        student['Department'] = dept1

    with open(file2, 'r') as f:
        data2 = json.load(f)
    for student in data2:
        student['Department'] = dept2

    merged_data = data1 + data2

    with open(output_file, 'w') as f:
        json.dump(merged_data, f, indent=4)

if __name__ == '__main__':
    merge_students('compstudents.json', 'Computer', 'entcstudents.json', 'ENTC', 'students.json')

    # Check the structure of itstudents.json
    with open('itstudents.json', 'r') as f:
        it_students = json.load(f)
        if it_students and isinstance(it_students, list) and 'Student Name' in it_students[0] and 'Birth Date' in it_students[0]:
            print("itstudents.json has the same structure. Merging it now.")
            merge_students('students.json', None, 'itstudents.json', 'IT', 'students.json')
        else:
            print("itstudents.json has a different structure.")

