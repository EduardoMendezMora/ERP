// Test script to verify button size changes
console.log('🔍 Testing button size changes...');

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const button = document.getElementById('showFormBtn');
        if (button) {
            const styles = window.getComputedStyle(button);
            console.log('📏 Button size analysis:');
            console.log('Button found:', !!button);
            console.log('Padding:', styles.padding);
            console.log('Font-size:', styles.fontSize);
            console.log('Border-radius:', styles.borderRadius);
            console.log('Display:', styles.display);
            console.log('Width:', styles.width);
            console.log('Min-width:', styles.minWidth);
            
            // Check if our CSS is applied
            const expectedPadding = '12px 20px';
            const expectedFontSize = '0.95rem';
            const expectedBorderRadius = '8px';
            
            console.log('✅ Expected vs Actual:');
            console.log('Padding:', expectedPadding, 'vs', styles.padding);
            console.log('Font-size:', expectedFontSize, 'vs', styles.fontSize);
            console.log('Border-radius:', expectedBorderRadius, 'vs', styles.borderRadius);
            
            if (styles.padding === expectedPadding && 
                styles.fontSize === expectedFontSize && 
                styles.borderRadius === expectedBorderRadius) {
                console.log('🎉 CSS changes are correctly applied!');
            } else {
                console.log('❌ CSS changes may not be applied. Try refreshing the page (Ctrl+F5)');
            }
        } else {
            console.log('❌ Button not found!');
        }
    }, 1000);
});

// Instructions for user
console.log('📋 Instructions:');
console.log('1. If you see "CSS changes are correctly applied" - the button should be smaller');
console.log('2. If you see "CSS changes may not be applied" - try refreshing with Ctrl+F5');
console.log('3. If button is still large, check browser developer tools (F12) > Elements tab');
console.log('4. Look for .show-form-btn CSS rules and verify the values');
