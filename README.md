# Building Interactive Music 

# How to run
## Deployed Demo
The app is deployed to heroku at http://interactive-music-generator.herokuapp.com/
## Run from source
Double-click `generate_music.html`. This is the root HTML file for the web app. This should open our home page as a static HTML page on your browser, and you can now play with the app!
## Link to demo video
https://bit.ly/building-interactive-music-demo

# Future Work
We see possibilities for future work on this system in expanding the variety of sonification methods for the user’s composition. At present, the composition can only be previewed through a single “instrumental mode” with a single sound quality. It would be empowering for a user to be able to select between different instrumental tones for a single composition, for example between strings or woodwind instruments. Additionally, the generation process does not produce chords or changes in dynamics and tempo. This may require a consideration of different music generation models which can produce these features in note sequences. We also see a possibility of including style transfer as a component of this application. Perhaps a finalized note sequence could have a music genre’s style transferred onto it as it is being sonified. With these additions, our system could become an even more educational and exciting interface with more experimental capacity. Finally, we would like to see this application made accessible on multiple platforms, including on mobile devices, as was suggested in the qualitative feedback on our survey.

# Summary of Contributions
## Robert:
* Created and encoded the demo video
* Led exploration and research of Google Magenta’s API
* Formulated the project idea and basic user flow for the interactive music generator
* Created the MVP proof-of-concept for new music sequence generation
* Built the MVP framework for user-input sequences via the piano UI including piano recording and playback functionality. Also implemented the necessary utilities to convert from vanilla user inputs to Magenta-readable data structures
* Implemented the majority of the work involving Magenta’s MusicRNN integration involving generating new sequences, visualizing sequences, audio playback, and conditioning on chord progression
* Designed the state management system of the app and did the majority of better engineering
* Created survey criteria to qualitative evaluate the web app
* Deployed the application to production on a Heroku dyno instance
* Created and managed the workflow and task management via an Asana board
* Wrote a substantial amount of the midterm report, including conclusion, discussion, introduction, and related work.

## Christine
* Explored an existing bidirectional LSTM model which makes use of Music21 for file parsing. Trained it on around 100 Classical Piano Compositions by JS Bach for up to 20 epochs using Google Colab. Informally evaluated the outputs, detecting more tonal shifts in the output after 20 vs. 10 epochs.
* Designed user flow for the web application, ranging from functional aspects to aesthetic considerations. Wrote nearly all CSS and some vanilla JS, the latter for showing parts of the page upon interaction. Ensured the setup page, with all its user customization features was immediately intelligible, and that the order in which it should be filled out was clear.
* Formatted the music generation section so that it would be intuitive to work between adding/previewing new options and seeing it in the overall composition, displayed on the main part of the page.
Came up with neon aesthetic and sourced mouse sparkle code online to add a playful dimension to the site.
* Integrated web piano into the UI and added key triggers for accessibility.
* Added ability for user to input/update a chord sequence and have it be stored in the application.
* Wrote Abstract, some details on LSTM implementation,Website User Flow details, and Future Work sections of the Final Report


## Will
* Trained the MuseGAN model for 5 different sets of hyperparameters and assessed the outputted music for smoothness and variation
* Wrote a majority of the Milestone Report, including the MuseGAN and Technical Approach sections
* Embellished the Building Interactive Music keyboard UI by designing its notes and displaying the keys’ corresponding computer keyboard letters
* Wrote the About description of Building Interactive Music
Made all slides in the Presentation
* Wrote a majority of the Final Report, including the Introduction, Related Work, Method, and Experiments sections
