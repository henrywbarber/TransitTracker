import { NavigationContainer } from '@react-navigation/native';
import { useState, useEffect } from 'react';

import TransitTabs from './navigation/TransitTabs';

export default function TransitTracker(props) {
    return (
        <>
            <NavigationContainer>
                <TransitTabs />
            </NavigationContainer>
        </>
    );
}