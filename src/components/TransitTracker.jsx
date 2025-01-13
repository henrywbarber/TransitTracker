import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import BottomTabs from "./navigation/BottomTabs";

function TransitTracker() {
    return (
        <NavigationContainer>
            <BottomTabs />
        </NavigationContainer>
    );
}

export default TransitTracker;
