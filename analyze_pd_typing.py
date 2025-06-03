import pandas as pd
import numpy as np
import json
from pathlib import Path
import string

def analyze_pd_typing_patterns():
    """Analyze PD typing patterns and create a model for generating realistic typing simulations"""
    
    print("Loading keystroke data...")
    # Load the processed keystroke data
    df = pd.read_csv('data/keystroke_data_nooutliers.csv')
    
    # Separate PD and control groups
    pd_data = df[df['has_parkinsons'] == True]
    control_data = df[df['has_parkinsons'] == False]
    
    # Create typing pattern statistics for different key types
    typing_patterns = {
        'pd': create_typing_statistics(pd_data),
        'control': create_typing_statistics(control_data)
    }
    
    # Save the typing patterns
    with open('data/typing_patterns.json', 'w') as f:
        json.dump(typing_patterns, f, indent=2)
    
    print("Typing pattern analysis complete!")
    return typing_patterns

def create_typing_statistics(data):
    """Create statistical model for typing patterns"""
    
    # Group by key type
    key_categories = {
        'letters': list(string.ascii_lowercase),
        'space': ['space'],
        'special': ['Shift_L', 'Shift_R', 'BackSpace', 'Tab', 'Enter', 'Control_L', 'Control_R']
    }
    
    stats = {}
    
    # Overall statistics
    stats['overall'] = {
        'delay': {
            'mean': float(data['delay'].mean() * 1000),  # Convert to ms
            'std': float(data['delay'].std() * 1000),
            'min': float(data['delay'].min() * 1000),
            'max': float(data['delay'].max() * 1000),
            'percentiles': {
                '25': float(data['delay'].quantile(0.25) * 1000),
                '50': float(data['delay'].quantile(0.50) * 1000),
                '75': float(data['delay'].quantile(0.75) * 1000)
            }
        },
        'duration': {
            'mean': float(data['duration'].mean() * 1000),  # Convert to ms
            'std': float(data['duration'].std() * 1000),
            'min': float(data['duration'].min() * 1000),
            'max': float(data['duration'].max() * 1000),
            'percentiles': {
                '25': float(data['duration'].quantile(0.25) * 1000),
                '50': float(data['duration'].quantile(0.50) * 1000),
                '75': float(data['duration'].quantile(0.75) * 1000)
            }
        }
    }
    
    # Per-key statistics
    stats['per_key'] = {}
    
    for key in data['key'].unique():
        key_data = data[data['key'] == key]
        if len(key_data) > 5:  # Only include keys with enough data
            key_lower = key.lower()
            stats['per_key'][key_lower] = {
                'delay': {
                    'mean': float(key_data['delay'].mean() * 1000),
                    'std': float(key_data['delay'].std() * 1000)
                },
                'duration': {
                    'mean': float(key_data['duration'].mean() * 1000),
                    'std': float(key_data['duration'].std() * 1000)
                },
                'count': len(key_data)
            }
    
    # Key category statistics
    stats['categories'] = {}
    for category, keys in key_categories.items():
        category_data = data[data['key'].str.lower().isin([k.lower() for k in keys])]
        if len(category_data) > 0:
            stats['categories'][category] = {
                'delay': {
                    'mean': float(category_data['delay'].mean() * 1000),
                    'std': float(category_data['delay'].std() * 1000)
                },
                'duration': {
                    'mean': float(category_data['duration'].mean() * 1000),
                    'std': float(category_data['duration'].std() * 1000)
                }
            }
    
    # Calculate average typing speed
    avg_typing_speed = data.groupby('pID')['typingSpeed'].first().mean()
    stats['avg_typing_speed'] = float(avg_typing_speed)
    
    return stats

def generate_typing_simulation(prompt, typing_patterns, group='pd'):
    """Generate a realistic typing simulation for a given prompt"""
    
    patterns = typing_patterns[group]
    simulation = []
    
    # Convert prompt to list of keys
    keys = []
    for char in prompt.lower():
        if char == ' ':
            keys.append('space')
        elif char in string.ascii_lowercase:
            keys.append(char)
    
    current_time = 0
    
    # Adjust base delays for more realistic typing speeds
    # PD patients typically type slower than controls
    base_delay_multiplier = 2.5 if group == 'pd' else 1.5
    variability_multiplier = 1.5 if group == 'pd' else 1.0
    
    for i, key in enumerate(keys):
        # Get delay (time since last key)
        if i == 0:
            delay = np.random.normal(200 * base_delay_multiplier, 50)  # First key delay
        else:
            # Use per-key statistics if available, otherwise use category or overall
            if key in patterns['per_key']:
                delay_stats = patterns['per_key'][key]['delay']
            elif key == 'space' and 'space' in patterns['categories']:
                delay_stats = patterns['categories']['space']['delay']
            elif key in string.ascii_lowercase and 'letters' in patterns['categories']:
                delay_stats = patterns['categories']['letters']['delay']
            else:
                delay_stats = patterns['overall']['delay']
            
            # Generate delay with some randomness and ensure minimum delay
            mean_delay = max(150, delay_stats['mean']) * base_delay_multiplier
            std_delay = delay_stats['std'] * 0.5 * variability_multiplier
            delay = max(100, np.random.normal(mean_delay, std_delay))
        
        # Get duration (how long key is held)
        if key in patterns['per_key']:
            duration_stats = patterns['per_key'][key]['duration']
        elif key == 'space' and 'space' in patterns['categories']:
            duration_stats = patterns['categories']['space']['duration']
        elif key in string.ascii_lowercase and 'letters' in patterns['categories']:
            duration_stats = patterns['categories']['letters']['duration']
        else:
            duration_stats = patterns['overall']['duration']
        
        # Generate duration with some randomness
        # PD patients tend to hold keys longer
        duration_multiplier = 1.3 if group == 'pd' else 1.0
        mean_duration = duration_stats['mean'] * duration_multiplier
        std_duration = duration_stats['std'] * 0.5 * variability_multiplier
        duration = max(50, np.random.normal(mean_duration, std_duration))
        
        current_time += delay
        
        simulation.append({
            'key': key,
            'delay': round(delay, 2),
            'duration': round(duration, 2),
            'press_time': round(current_time, 2),
            'release_time': round(current_time + duration, 2)
        })
    
    return simulation

def create_prompt_simulations():
    """Create simulations for all typing prompts"""
    
    # Load typing patterns
    with open('data/typing_patterns.json', 'r') as f:
        typing_patterns = json.load(f)
    
    # List of prompts to simulate - categorized by length
    prompts = [
        # Short prompts (5-10 words)
        "the quick brown fox jumps over the lazy dog",
        "pack my box with five dozen liquor jugs",
        "how vexingly quick daft zebras jump",
        "sphinx of black quartz judge my vow",
        "the five boxing wizards jump quickly",
        "jackdaws love my big sphinx of quartz",
        "two driven jocks help fax my big quiz",
        "five quacking zephyrs jolt my wax bed",
        
        # Medium prompts (15-25 words)
        "the job requires extra pluck and zeal from every young wage earner who wants to succeed in business",
        "modern technology has revolutionized the way we communicate and share information across the globe in recent decades",
        "scientists continue to make remarkable discoveries about the universe while exploring new frontiers in space and medicine",
        "artificial intelligence and machine learning are transforming industries by automating complex tasks and improving efficiency worldwide",
        "climate change poses significant challenges that require immediate action from governments and individuals working together for solutions",
        "digital transformation has changed how businesses operate by integrating advanced technologies into their daily operations and strategies",
        
        # Long prompts (30-50 words)
        "the advancement of medical research has led to breakthrough treatments for previously incurable diseases while simultaneously raising ethical questions about genetic engineering and the future of human enhancement technologies",
        "sustainable energy solutions including solar wind and hydroelectric power are becoming increasingly important as countries worldwide work to reduce carbon emissions and combat the effects of global warming",
        "social media platforms have fundamentally altered human communication patterns by creating new forms of interaction while also presenting challenges related to privacy misinformation and mental health in modern society",
        "educational institutions are adapting to digital learning environments by implementing innovative teaching methods and technologies that enhance student engagement and accessibility to knowledge from anywhere in the world",
        "economic inequality continues to grow in many developed nations as technological automation replaces traditional jobs while creating new opportunities that often require advanced skills and specialized training programs"
    ]
    
    simulations = {}
    
    for prompt in prompts:
        simulations[prompt] = {
            'pd': generate_typing_simulation(prompt, typing_patterns, 'pd'),
            'control': generate_typing_simulation(prompt, typing_patterns, 'control')
        }
    
    # Save simulations
    with open('data/typing_simulations.json', 'w') as f:
        json.dump(simulations, f, indent=2)
    
    print(f"Generated simulations for {len(prompts)} prompts")
    
    # Also save general typing patterns for dynamic generation
    return simulations

if __name__ == "__main__":
    # First analyze the patterns
    patterns = analyze_pd_typing_patterns()
    
    # Then create simulations
    simulations = create_prompt_simulations()
    
    # Print some statistics
    print("\nTyping Pattern Statistics:")
    print(f"PD Average Delay: {patterns['pd']['overall']['delay']['mean']:.0f}ms")
    print(f"PD Average Duration: {patterns['pd']['overall']['duration']['mean']:.0f}ms")
    print(f"Control Average Delay: {patterns['control']['overall']['delay']['mean']:.0f}ms")
    print(f"Control Average Duration: {patterns['control']['overall']['duration']['mean']:.0f}ms") 