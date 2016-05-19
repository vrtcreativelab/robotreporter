/*
 HC-SR04 Ping distance sensor:
 VCC to 5v 
 GND to GND
 Echo to pinRightProxSensorEcho/pinLeftProxSensorEcho
 Trig to pinRightProxSensorTrig/pinLeftProxSensorTrig

 IRS01a sensors https://www.pololu.com/product/959
 Vin to 5v
 GND to GND
 Out to pinLeftEdgeSensor/pinRightEdgeSensor
 */


boolean sensorOnEdge (uint8_t pin);
boolean sensorProximity(uint8_t trigPin, uint8_t echoPin);

#define pinRightEdgeSensor 4             
#define pinLeftEdgeSensor 5
#define edgeSensorThreshold 100

#define pinRightProxSensorEcho 6
#define pinRightProxSensorTrig 7             
#define pinLeftProxSensorEcho 8
#define pinLeftProxSensorTrig 9             
#define proxSensorThreshold 8 // cm to avoid collision

#define pinDirectionA 12 // A = left wheel
#define pinDirectionB 13
#define pinSpeedA 3
#define pinSpeedB 11


#define DEBUG true



void setup() {
  pinMode(pinRightProxSensorTrig, OUTPUT);
  pinMode(pinRightProxSensorEcho, INPUT);
  pinMode(pinLeftProxSensorTrig, OUTPUT);
  pinMode(pinLeftProxSensorEcho, INPUT);

  if (DEBUG) {
    Serial.begin(9600);
  }
  
  delay(500);

}

void loop() {

  // Checkin for obstacles
  if (sensorOnEdge(pinLeftEdgeSensor)) {
    printDebugText("LEFT OVER EDGE");
  } else if (sensorOnEdge(pinRightEdgeSensor)) {
    printDebugText("RIGHT OVER EDGE");
  } else if (sensorProximity(pinLeftProxSensorTrig, pinLeftProxSensorEcho)) {
    printDebugText("Possible collision left");
  } else if (sensorProximity(pinRightProxSensorTrig, pinRightProxSensorEcho)) {
    printDebugText("Possible collision right");
  }

  delay(50);
}

/**
* returns true if the proximity sensor is too close
*/
boolean sensorProximity(uint8_t trigPin, uint8_t echoPin)
{
  long duration, distance;
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  duration = pulseIn(echoPin, HIGH);

  //Calculate the distance (in cm) based on the speed of sound.
  distance = duration / 58.2;

  return (distance < proxSensorThreshold);
}

/**
* returns true if the sensor is over the edge (for the given edge pin)
*/
boolean sensorOnEdge(uint8_t pin) 
{
  pinMode(pin, OUTPUT);  
  digitalWrite(pin, HIGH);
  uint32_t t0 = micros();
  uint32_t dif;
  pinMode(pin, INPUT);
  
  while(digitalRead(pin)) {
    dif = micros() - t0;
    if (dif > edgeSensorThreshold) break;
  }
  
  return dif > edgeSensorThreshold;
}

void printDebugText(String text)
{
  if (DEBUG) {
    Serial.println(text);
  }
}

