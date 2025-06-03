import pandas as pd
import numpy as np
import os
from pathlib import Path
import glob

def process_keystroke_data():
    """Process raw keystroke data from MIT-CS1PD and MIT-CS2PD datasets"""
    
    # Define paths
    base_path = Path("neuroqwerty-mit-csxpd-dataset-1.0.0")
    cs1_path = base_path / "MIT-CS1PD"
    cs2_path = base_path / "MIT-CS2PD"
    
    # Read ground truth data
    gt_cs1 = pd.read_csv(cs1_path / "GT_DataPD_MIT-CS1PD.csv")
    gt_cs2 = pd.read_csv(cs2_path / "GT_DataPD_MIT-CS2PD.csv")
    
    # Combine ground truth data
    gt_combined = pd.concat([gt_cs1, gt_cs2], ignore_index=True)
    
    # Initialize list to store all keystroke data
    all_keystrokes = []
    
    # Process CS1PD data
    print("Processing CS1PD data...")
    for _, row in gt_cs1.iterrows():
        pID = row['pID']
        has_parkinsons = row['gt']
        updrs = row['updrs108']
        typing_speed = row['typingSpeed']
        
        # Process file_1 if exists
        if pd.notna(row['file_1']):
            file_path = cs1_path / "data_MIT-CS1PD" / row['file_1']
            if file_path.exists():
                process_single_file(file_path, pID, has_parkinsons, updrs, typing_speed, all_keystrokes)
    
    # Process CS2PD data
    print("Processing CS2PD data...")
    for _, row in gt_cs2.iterrows():
        pID = row['pID']
        has_parkinsons = row['gt']
        updrs = row['updrs108']
        typing_speed = row['typingSpeed']
        
        # Process file_1 if exists
        if pd.notna(row['file_1']):
            file_path = cs2_path / "data_MIT-CS2PD" / row['file_1']
            if file_path.exists():
                process_single_file(file_path, pID, has_parkinsons, updrs, typing_speed, all_keystrokes)
    
    # Create DataFrame from all keystrokes
    df_keystrokes = pd.DataFrame(all_keystrokes)
    
    # Remove outliers using IQR method
    df_keystrokes_no_outliers = remove_outliers(df_keystrokes)
    
    # Create aggregated data
    df_aggregated = create_aggregated_data(df_keystrokes_no_outliers, gt_combined)
    
    # Save processed data
    print("Saving processed data...")
    df_keystrokes.to_csv("data/keystroke_data.csv", index=False)
    df_keystrokes_no_outliers.to_csv("data/keystroke_data_nooutliers.csv", index=False)
    df_aggregated.to_csv("data/agg_keystroke.csv", index=False)
    
    # Save ground truth data
    gt_cs1.to_csv("data/GT_DataPD_MIT-CS1PD.csv", index=False)
    gt_cs2.to_csv("data/GT_DataPD_MIT-CS2PD.csv", index=False)
    
    print("Data processing complete!")
    return df_keystrokes, df_keystrokes_no_outliers, df_aggregated

def process_single_file(file_path, pID, has_parkinsons, updrs, typing_speed, all_keystrokes):
    """Process a single keystroke file"""
    try:
        # Read the CSV file
        df = pd.read_csv(file_path, header=None, names=['key', 'press_0', 'release_0', 'duration'])
        
        # Add metadata
        df['pID'] = pID
        df['has_parkinsons'] = has_parkinsons
        df['updrs108'] = updrs
        df['typingSpeed'] = typing_speed
        df['file_1'] = file_path.name
        
        # Sort by press time to ensure correct order
        df = df.sort_values('press_0').reset_index(drop=True)
        
        # Calculate delay (time between consecutive key presses)
        df['delay'] = df['press_0'].diff()
        df.loc[0, 'delay'] = 0.1  # First key delay set to 100ms
        
        # Fill any negative or NaN delays with a small positive value
        df.loc[df['delay'] <= 0, 'delay'] = 0.1
        df['delay'].fillna(0.1, inplace=True)
        
        # Ensure duration is positive
        df['duration'] = df['release_0'] - df['press_0']
        df.loc[df['duration'] <= 0, 'duration'] = 0.1
        
        # Add key index
        df['key_index'] = range(len(df))
        
        # Filter out invalid entries
        df = df[df['press_0'] > 0]  # Remove negative timestamps
        df = df[df['key'].notna()]  # Remove NaN keys
        df = df[df['duration'] > 0]  # Remove zero or negative durations
        df = df[df['delay'] >= 0]  # Remove negative delays
        
        # Convert to list of dictionaries and append
        keystroke_records = df.to_dict('records')
        all_keystrokes.extend(keystroke_records)
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def remove_outliers(df):
    """Remove outliers using IQR method"""
    df_cleaned = df.copy()
    
    # Remove outliers for delay
    Q1_delay = df_cleaned['delay'].quantile(0.25)
    Q3_delay = df_cleaned['delay'].quantile(0.75)
    IQR_delay = Q3_delay - Q1_delay
    lower_bound_delay = Q1_delay - 1.5 * IQR_delay
    upper_bound_delay = Q3_delay + 1.5 * IQR_delay
    
    # Remove outliers for duration
    Q1_duration = df_cleaned['duration'].quantile(0.25)
    Q3_duration = df_cleaned['duration'].quantile(0.75)
    IQR_duration = Q3_duration - Q1_duration
    lower_bound_duration = Q1_duration - 1.5 * IQR_duration
    upper_bound_duration = Q3_duration + 1.5 * IQR_duration
    
    # Apply filters
    df_cleaned = df_cleaned[
        (df_cleaned['delay'] >= lower_bound_delay) & 
        (df_cleaned['delay'] <= upper_bound_delay) &
        (df_cleaned['duration'] >= lower_bound_duration) & 
        (df_cleaned['duration'] <= upper_bound_duration)
    ]
    
    # Additional filters for extreme values
    df_cleaned = df_cleaned[df_cleaned['delay'] < 2.5]  # Remove delays > 2.5 seconds
    df_cleaned = df_cleaned[df_cleaned['duration'] < 0.5]  # Remove durations > 0.5 seconds
    
    return df_cleaned

def create_aggregated_data(df, gt_data):
    """Create aggregated statistics per patient"""
    agg_data = []
    
    for pID in df['pID'].unique():
        patient_data = df[df['pID'] == pID]
        
        # Get patient metadata from ground truth
        patient_gt = gt_data[gt_data['pID'] == pID].iloc[0]
        
        # Calculate aggregated statistics
        agg_stats = {
            'pID': pID,
            'has_parkinsons': patient_gt['gt'],
            'updrs108': patient_gt['updrs108'],
            'typingSpeed': patient_gt['typingSpeed'],
            'duration': patient_data['duration'].mean(),
            'delay': patient_data['delay'].mean()
        }
        
        agg_data.append(agg_stats)
    
    return pd.DataFrame(agg_data)

# Create data directory if it doesn't exist
if not os.path.exists('data'):
    os.makedirs('data')

# Run the processing
if __name__ == "__main__":
    process_keystroke_data() 