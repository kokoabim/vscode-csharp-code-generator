# Features

This is initial release and has minimal features. More features will be added in future updates.

Current C# code generations:

- Generate interface from class — Command _"Generate C# Class From Interface..."_ (`csharp-code-generator.generate-class-from-interface`)
- Generate class from interface — Command _"Generate C# Interface From Class..."_ (`csharp-code-generator.generate-interface-from-class`)

Additional features:

- On class generation from an interface, if the source interface implements a defined **Interface Implementation** in settings, its implementation is generated with the class.
    - **Example:** The interface `IExample` implements `IDisposable` and in settings there is a defined **Interface Implementation** for `IDisposable`, then it is generated with the class.
    - **Note:** By default, an **Interface Implementation** for `IDisposable` is defined in settings. Other common interfaces will be added by default in future updates.
